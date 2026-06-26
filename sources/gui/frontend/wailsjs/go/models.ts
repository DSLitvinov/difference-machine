export namespace main {
	
	export class RepoState {
	    repoPath: string;
	    repoName: string;
	    status: string;
	
	    static createFrom(source: any = {}) {
	        return new RepoState(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.repoPath = source["repoPath"];
	        this.repoName = source["repoName"];
	        this.status = source["status"];
	    }
	}
	export class SettingsSnapshot {
	    userName: string;
	    userEmail: string;
	    language: string;
	    repos: string[];
	    currentRepo: string;
	    configPath: string;
	    foresterCli: string;
	    blenderPath: string;
	    addonPath: string;
	    editors: string[];
	    theme: string;
	    font: string;
	
	    static createFrom(source: any = {}) {
	        return new SettingsSnapshot(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.userName = source["userName"];
	        this.userEmail = source["userEmail"];
	        this.language = source["language"];
	        this.repos = source["repos"];
	        this.currentRepo = source["currentRepo"];
	        this.configPath = source["configPath"];
	        this.foresterCli = source["foresterCli"];
	        this.blenderPath = source["blenderPath"];
	        this.addonPath = source["addonPath"];
	        this.editors = source["editors"];
	        this.theme = source["theme"];
	        this.font = source["font"];
	    }
	}

}

