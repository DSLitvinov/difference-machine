package main

import (
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestShouldRunScheduledGC(t *testing.T) {
	loc := time.FixedZone("test", 0)
	now := time.Date(2026, 8, 26, 7, 0, 0, 0, loc)
	if shouldRunScheduledGC(now, 0, 7, 7, 0) {
		t.Fatal("never run should not auto-start")
	}
	sixDays := time.Date(2026, 8, 20, 7, 0, 0, 0, loc).Unix()
	if shouldRunScheduledGC(now, sixDays, 7, 7, 0) {
		t.Fatal("interval not elapsed")
	}
	sevenDays := time.Date(2026, 8, 19, 7, 0, 0, 0, loc).Unix()
	if !shouldRunScheduledGC(now, sevenDays, 7, 7, 0) {
		t.Fatal("interval elapsed at scheduled time should run")
	}
	before := time.Date(2026, 8, 26, 6, 59, 0, 0, loc)
	if shouldRunScheduledGC(before, sevenDays, 7, 7, 0) {
		t.Fatal("before scheduled time should not run")
	}
}

func TestSaveGCRoundTrip(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	app := NewApp()
	if err := app.SaveGC(true, 120, true, 14, 8, 30); err != nil {
		t.Fatal(err)
	}
	cfg, err := loadSetupCfg()
	if err != nil {
		t.Fatal(err)
	}
	if !cfg.GCEnabled || cfg.GCReflogExpireDays != 120 {
		t.Fatalf("gc = enabled=%v days=%d", cfg.GCEnabled, cfg.GCReflogExpireDays)
	}
	if !cfg.GCScheduleEnabled || cfg.GCIntervalDays != 14 || cfg.GCScheduleHour != 8 || cfg.GCScheduleMinute != 30 {
		t.Fatalf("schedule = %+v", cfg)
	}
	body, err := os.ReadFile(filepath.Join(home, ".dfm", "setup.cfg"))
	if err != nil {
		t.Fatal(err)
	}
	text := string(body)
	for _, want := range []string{
		"[gc]",
		"enabled = true",
		"reflog.expire.days = 120",
		"schedule.enabled = true",
		"interval.day = 14",
		"schedule.hour = 8",
		"schedule.minute = 30",
	} {
		if !strings.Contains(text, want) {
			t.Fatalf("setup.cfg missing %q:\n%s", want, text)
		}
	}
}

func TestLoadGCScheduleKeys(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	dir := filepath.Join(home, ".dfm")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	body := "[gc]\nenabled = true\nschedule.enabled = false\nreflog.expire.days = 30\ninterval.day = 14\nschedule.hour = 7\nschedule.minute = 0\n"
	if err := os.WriteFile(filepath.Join(dir, "setup.cfg"), []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err := loadSetupCfg()
	if err != nil {
		t.Fatal(err)
	}
	if !cfg.GCEnabled || cfg.GCScheduleEnabled || cfg.GCReflogExpireDays != 30 || cfg.GCIntervalDays != 14 {
		t.Fatalf("loaded = %+v", cfg)
	}
	if cfg.GCScheduleHour != 7 || cfg.GCScheduleMinute != 0 {
		t.Fatalf("time = %d:%d", cfg.GCScheduleHour, cfg.GCScheduleMinute)
	}
}

func TestLoadGCScheduleFallbackFromEnabled(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	dir := filepath.Join(home, ".dfm")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	body := "[gc]\nenabled = true\nreflog.expire.days = 30\ninterval.day = 14\n"
	if err := os.WriteFile(filepath.Join(dir, "setup.cfg"), []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err := loadSetupCfg()
	if err != nil {
		t.Fatal(err)
	}
	if !cfg.GCScheduleEnabled {
		t.Fatal("missing schedule.enabled should follow enabled")
	}
}

func TestLoadGCClampsAndDefaults(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	dir := filepath.Join(home, ".dfm")
	if err := os.MkdirAll(dir, 0o755); err != nil {
		t.Fatal(err)
	}
	body := "[gc]\nreflog.expire.days = 99999\ninterval.day = 0\nschedule.hour = 99\nschedule.minute = 99\n"
	if err := os.WriteFile(filepath.Join(dir, "setup.cfg"), []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
	cfg, err := loadSetupCfg()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.GCReflogExpireDays != gcReflogDaysMax {
		t.Fatalf("reflog = %d", cfg.GCReflogExpireDays)
	}
	if cfg.GCIntervalDays != gcIntervalDaysMin {
		t.Fatalf("interval = %d", cfg.GCIntervalDays)
	}
	if cfg.GCScheduleHour != gcHourMax {
		t.Fatalf("hour = %d", cfg.GCScheduleHour)
	}
	if cfg.GCScheduleMinute != gcMinuteMax {
		t.Fatalf("minute = %d", cfg.GCScheduleMinute)
	}
	if cfg.GCEnabled || cfg.GCScheduleEnabled {
		t.Fatal("missing switches should be false")
	}
}

func TestSettingsFromCfgGCDefaults(t *testing.T) {
	info := settingsFromCfg(setupCfg{}, repoState{})
	if info.GCEnabled || info.GCScheduleEnabled || info.GCReflogExpireDays != gcReflogDaysDefault {
		t.Fatalf("defaults = %+v", info)
	}
	if info.GCIntervalDays != gcIntervalDaysDefault {
		t.Fatalf("interval default = %d", info.GCIntervalDays)
	}
}

func TestRunGarbageCollectionRequiresSession(t *testing.T) {
	home := t.TempDir()
	t.Setenv("HOME", home)
	app := NewApp()
	_, err := app.RunGarbageCollection(90)
	if err == nil || err.Error() != "invalid session handle" {
		t.Fatalf("err = %v", err)
	}
}
