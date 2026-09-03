export namespace main {
	
	export class GCRunResult {
	    commitsDeleted: number;
	    treesDeleted: number;
	    blobsDeleted: number;
	    lastRun: number;
	
	    static createFrom(source: any = {}) {
	        return new GCRunResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.commitsDeleted = source["commitsDeleted"];
	        this.treesDeleted = source["treesDeleted"];
	        this.blobsDeleted = source["blobsDeleted"];
	        this.lastRun = source["lastRun"];
	    }
	}
	export class SessionInfo {
	    shell: string;
	    repoPath: string;
	    locale: string;
	    theme: string;
	    userName: string;
	    userEmail: string;
	    platform: string;
	    isRepository: boolean;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new SessionInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.shell = source["shell"];
	        this.repoPath = source["repoPath"];
	        this.locale = source["locale"];
	        this.theme = source["theme"];
	        this.userName = source["userName"];
	        this.userEmail = source["userEmail"];
	        this.platform = source["platform"];
	        this.isRepository = source["isRepository"];
	        this.error = source["error"];
	    }
	}
	export class SettingsInfo {
	    userName: string;
	    userEmail: string;
	    locale: string;
	    theme: string;
	    repos: string[];
	    apiPath: string;
	    foresterPath: string;
	    blenderPath: string;
	    addonPath: string;
	    editors: string[];
	    platform: string;
	    hasRepository: boolean;
	    gcEnabled: boolean;
	    gcReflogExpireDays: number;
	    gcScheduleEnabled: boolean;
	    gcIntervalDays: number;
	    gcScheduleHour: number;
	    gcScheduleMinute: number;
	
	    static createFrom(source: any = {}) {
	        return new SettingsInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.userName = source["userName"];
	        this.userEmail = source["userEmail"];
	        this.locale = source["locale"];
	        this.theme = source["theme"];
	        this.repos = source["repos"];
	        this.apiPath = source["apiPath"];
	        this.foresterPath = source["foresterPath"];
	        this.blenderPath = source["blenderPath"];
	        this.addonPath = source["addonPath"];
	        this.editors = source["editors"];
	        this.platform = source["platform"];
	        this.hasRepository = source["hasRepository"];
	        this.gcEnabled = source["gcEnabled"];
	        this.gcReflogExpireDays = source["gcReflogExpireDays"];
	        this.gcScheduleEnabled = source["gcScheduleEnabled"];
	        this.gcIntervalDays = source["gcIntervalDays"];
	        this.gcScheduleHour = source["gcScheduleHour"];
	        this.gcScheduleMinute = source["gcScheduleMinute"];
	    }
	}

}

