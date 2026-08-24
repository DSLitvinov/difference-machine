export namespace main {
	
	export class SessionInfo {
	    shell: string;
	    repoPath: string;
	    locale: string;
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
	        this.userName = source["userName"];
	        this.userEmail = source["userEmail"];
	        this.isRepository = source["isRepository"];
	        this.error = source["error"];
	    }
	}

}

