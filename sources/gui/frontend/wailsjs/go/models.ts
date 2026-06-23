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

}

