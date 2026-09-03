package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"
)

func (a *App) startGCScheduler() {
	if a.gcStop != nil {
		return
	}
	stop := make(chan struct{})
	a.gcStop = stop
	go func() {
		ticker := time.NewTicker(time.Minute)
		defer ticker.Stop()
		for {
			select {
			case <-ticker.C:
				a.maybeRunScheduledGC()
			case <-stop:
				return
			}
		}
	}()
}

func (a *App) stopGCScheduler() {
	if a.gcStop == nil {
		return
	}
	close(a.gcStop)
	a.gcStop = nil
}

func (a *App) maybeRunScheduledGC() {
	cfg, err := loadSetupCfg()
	if err != nil || !cfg.GCScheduleEnabled {
		return
	}
	if !shouldRunScheduledGC(time.Now(), cfg.GCLastRun, cfg.GCIntervalDays, cfg.GCScheduleHour, cfg.GCScheduleMinute) {
		return
	}
	a.mu.Lock()
	ok := a.hasSession
	a.mu.Unlock()
	if !ok {
		return
	}
	_, _ = a.RunGarbageCollection(cfg.GCReflogExpireDays)
}

func shouldRunScheduledGC(now time.Time, lastRunUnix int64, intervalDays, hour, minute int) bool {
	if lastRunUnix <= 0 {
		return false
	}
	if intervalDays < gcIntervalDaysMin {
		intervalDays = gcIntervalDaysDefault
	}
	hour = clampInt(hour, gcHourMin, gcHourMax, gcScheduleHourDefault)
	minute = clampInt(minute, gcMinuteMin, gcMinuteMax, gcScheduleMinuteDefault)
	last := time.Unix(lastRunUnix, 0).In(now.Location())
	if calendarDaysBetween(last, now) < intervalDays {
		return false
	}
	scheduled := time.Date(now.Year(), now.Month(), now.Day(), hour, minute, 0, 0, now.Location())
	return !now.Before(scheduled)
}

func calendarDaysBetween(from, to time.Time) int {
	a := time.Date(from.Year(), from.Month(), from.Day(), 0, 0, 0, 0, time.UTC)
	b := time.Date(to.Year(), to.Month(), to.Day(), 0, 0, 0, 0, time.UTC)
	if b.Before(a) {
		return 0
	}
	return int(b.Sub(a) / (24 * time.Hour))
}

// RunGarbageCollection runs gc.run on the open repository and stores last.run.
func (a *App) RunGarbageCollection(reflogExpireDays int) (GCRunResult, error) {
	if !a.gcBusy.CompareAndSwap(false, true) {
		return GCRunResult{}, errors.New("garbage collection already running")
	}
	defer a.gcBusy.Store(false)

	days := clampInt(reflogExpireDays, gcReflogDaysMin, gcReflogDaysMax, gcReflogDaysDefault)
	raw := a.ForesterCall("gc.run", fmt.Sprintf(`{"dry_run":false,"reflog_expire_days":%d}`, days))
	var env struct {
		OK     bool   `json:"ok"`
		Error  string `json:"error"`
		Result struct {
			CommitsDeleted int `json:"commits_deleted"`
			TreesDeleted   int `json:"trees_deleted"`
			BlobsDeleted   int `json:"blobs_deleted"`
		} `json:"result"`
	}
	if err := json.Unmarshal([]byte(raw), &env); err != nil {
		return GCRunResult{}, err
	}
	if !env.OK {
		if env.Error == "" {
			return GCRunResult{}, errors.New("request failed")
		}
		return GCRunResult{}, errors.New(env.Error)
	}
	lastRun := time.Now().Unix()
	if err := updateSetupCfg(func(cfg *setupCfg) {
		cfg.GCLastRun = lastRun
	}); err != nil {
		return GCRunResult{}, err
	}
	return GCRunResult{
		CommitsDeleted: env.Result.CommitsDeleted,
		TreesDeleted:   env.Result.TreesDeleted,
		BlobsDeleted:   env.Result.BlobsDeleted,
		LastRun:        lastRun,
	}, nil
}
