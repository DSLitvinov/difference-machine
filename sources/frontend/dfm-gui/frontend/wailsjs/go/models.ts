export namespace main {
	
	export class SessionInfo {
	    shell: string;
	    repoPath: string;
	    locale: string;
	    theme: string;
	    userName: string;
	    userEmail: string;
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
	    }
	}

}

