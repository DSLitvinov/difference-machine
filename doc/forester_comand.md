Forester Commands (Full)
========================

Short version: `doc/forester_command_short.md`

This document describes the CLI commands for `forester` and their arguments.
All commands use strict argument validation:
- Unknown flags are errors.
- Extra positional arguments are errors.
- Flags that require values must receive them.
- Mutually exclusive flags are rejected.

General
-------
- `<commit>` accepts full hash or short hash in most commands.
- Some commands (noted below) require full 64-character hash.
- Paths can be absolute or relative to the repository root.

Commands
--------

init
~~~~
Initialize a new repository.

Syntax:
- `forester init [path]`

status
~~~~~~
Show repository status.

Syntax:
- `forester status [--short|-s] [--color|--color=always|--color=never|--no-color]`

add
~~~
Add files to the index.

Syntax:
- `forester add <path>...`
- `forester add -u|--update [<path>...]`

Notes:
- `-u` without paths is equivalent to `.` (tracked files only).

commit
~~~~~~
Create a commit from the index.

Syntax:
- `forester commit "message" [--author <name>] [--tag <name>] [--no-verify] [-a|--all] [--amend] [--no-edit]`

Rules:
- `--no-edit` requires `--amend`.
- `--no-edit` cannot be combined with a message.
- `-m/--message` is not supported (error).

rm
~~
Remove files from index and working directory.

Syntax:
- `forester rm <path>...`
- `forester rm -r|--recursive <dir>`

drop
~~~~
Remove files from index only (keep on disk).

Syntax:
- `forester drop <path>...`
- `forester drop -r|--recursive <dir>`

mv
~~
Move/rename a tracked file or directory.

Syntax:
- `forester mv <old> <new>`

branch
~~~~~~
List, create, delete, or rename branches.

Syntax:
- `forester branch`
- `forester branch -v|--verbose`
- `forester branch <name>`
- `forester branch -d|--delete <name>`
- `forester branch -m|--move|--rename <old> <new>`

switch
~~~~~~
Switch to a branch or commit.

Syntax:
- `forester switch <branch|commit>`
- `forester switch -a|--auto-stash <branch|commit>`

log
~~~
Show commit history.

Syntax:
- `forester log [<branch>] [options]`

Options:
- `--oneline`
- `--graph`
- `--all` (cannot be combined with `<branch>`)
- `--stat` (mutually exclusive with `--name-only/--name-status`)
- `--name-only`
- `--name-status`
- `-n <count>` or `-n<count>` or `--max-count=<count>`
- `--pretty=<format>` (use `oneline`, `short`, `medium`, `full`, `fuller`, `format:`)
- `--since <time>` or `--since=<time>`
- `--until <time>` or `--until=<time>`
- `--author <pattern>` or `--author=<pattern>`
- `--grep <pattern>` or `--grep=<pattern>`

show
~~~~
Show commit details or file content from a commit.

Syntax:
- `forester show <commit>`
- `forester show <commit>:<file>`
- `forester show --stat <commit>`

diff
~~~~
Show differences.

Syntax:
- `forester diff [<commit1> [commit2]] [options]`
- `forester diff <commit>:<file>`
- `forester diff --cached|--staged [options]`

Options:
- `--unified|-u`
- `--color|--color=always|--color=never|--no-color|--color=<mode>`
- `--stat` (mutually exclusive with `--name-only/--name-status`)
- `--name-only`
- `--name-status`
- `-w|--ignore-all-space`
- `-b|--ignore-space-change`

restore
~~~~~~~
Restore files from index or commit.

Syntax:
- `forester restore <file>...`
- `forester restore --staged <file>...`
- `forester restore --source=<commit> <file>...`

Rules:
- `--staged` and `--source` are mutually exclusive.

restore-version
~~~~~~~~~~~~~~
Restore the working directory to exactly match a commit (full overwrite). Removes files not in the commit, writes all commit files. Does not use temporary directories; does not touch `.DFM`.

Syntax:
- `forester restore-version <commit>`

Notes:
- `<commit>` can be full or short hash, or HEAD.
- After running, working tree matches the commit; then use `forester add .` and `forester commit "..."` to record that state as a new commit if desired.

reset
~~~~~
Move HEAD to a commit.

Syntax:
- `forester reset <commit>`
- `forester reset --soft|--mixed|--hard <commit>`

Rules:
- `--soft`, `--mixed`, and `--hard` are mutually exclusive.

revert
~~~~~~
Create a commit that reverts another commit.

Syntax:
- `forester revert <commit>`

cherry-pick
~~~~~~~~~~~
Apply a commit on top of current branch.

Syntax:
- `forester cherry-pick <commit>`

merge
~~~~~
Merge a branch into the current branch.

Syntax:
- `forester merge <branch> [options]`
- `forester merge --abort`
- `forester merge --continue`

Options:
- `--no-ff` (mutually exclusive with `--ff-only`)
- `--ff-only`
- `--squash` (mutually exclusive with `--no-commit`)
- `--no-commit`
- `-s|--strategy <name>`
- `-X|--strategy-option <name>`

Rules:
- `--abort/--continue` cannot be combined with other options.

move-to
~~~~~~~
Move current branch commits on top of another branch.

Syntax:
- `forester move-to <base-branch>`

tag
~~~
Create, delete, or list tags.

Syntax:
- `forester tag` (list)
- `forester tag -d|--delete <name>`
- `forester tag -a|--annotate -m <message> <name>`

Rules:
- `-m` requires `-a`.

stash
~~~~~
Manage stashes.

Syntax:
- `forester stash [list]`
- `forester stash save [message]`
- `forester stash pop [stash_hash]`
- `forester stash apply [stash_hash]`
- `forester stash drop <stash_hash>`
- `forester stash clear`
- `forester stash show [stash_hash]`
- `forester stash branch <branch_name> [stash_hash]`

clean
~~~~~
Remove untracked files.

Syntax:
- `forester clean -l|--list`
- `forester clean -n|--dry-run`
- `forester clean -f|--force`
- `forester clean -d|--dirs`

Rules:
- `--dry-run` and `--force` are mutually exclusive.

gc
~~
Garbage collection.

Syntax:
- `forester gc [--dry-run|-n] [--reflog-expire <days>]`

hook
~~~~
Manage hooks.

Syntax:
- `forester hook [list]`
- `forester hook install <hook_name> <script_path>`
- `forester hook remove <hook_name>`

lock
~~~~
Manage file locks.

Syntax:
- `forester lock [list]`
- `forester lock unlock <file>`
- `forester lock <file> [--shared|--exclusive] [--expire <hours>]`

Rules:
- `--shared` and `--exclusive` are mutually exclusive.

config
~~~~~~
Global configuration.

Syntax:
- `forester config --list`
- `forester config --global <key> <value>`

compare
~~~~~~~
Compare commits or extract a commit to `tmp_review`.

Syntax:
- `forester compare <commit1> [commit2] [--cleanup] [--editor <path>]`

Rules:
- Commit hashes must be full 64-character hashes.
- `--cleanup` requires a single commit.

rebuild
~~~~~~~
Scan object store and report statistics.

Syntax:
- `forester rebuild`

review
~~~~~~
Review system.

Syntax:
- `forester review comment <asset_type> <asset_id> <message> [x y]`
- `forester review list <asset_type> <asset_id>`
- `forester review approve <asset_type> <asset_id>`
- `forester review reject <asset_type> <asset_id> [reason]`
- `forester review resolve <comment_id>`

lol
~~~
Print a verse.

Syntax:
- `forester lol`

Examples and Errors
-------------------

init
~~~~
Examples:
- `forester init`
- `forester init /path/to/project`
Errors:
- Extra arguments: `usage: init [path]`

status
~~~~~~
Examples:
- `forester status`
- `forester status --short`
Errors:
- Unknown flag: `unknown flag: --foo`
- Extra args: `unexpected arguments: <args>`

add
~~~
Examples:
- `forester add file.txt`
- `forester add .`
- `forester add -u`
Errors:
- No paths: `no files specified. Use '.' to add all files`
- Unknown flag: `unknown flag: --foo`

commit
~~~~~~
Examples:
- `forester commit "Initial commit"`
- `forester commit "Fix" --author "Alice"`
- `forester commit --amend --no-edit`
Errors:
- Missing message: `commit message required`
- Unsupported `-m`: `flag -m is not supported...`
- `--no-edit` without `--amend`

rm
~~
Examples:
- `forester rm file.txt`
- `forester rm -r dir/`
Errors:
- Unknown flag: `unknown flag: --foo`
- Directory without `-r`

drop
~~~~
Examples:
- `forester drop file.txt`
- `forester drop -r dir/`
Errors:
- Unknown flag: `unknown flag: --foo`
- Directory without `-r`

mv
~~
Examples:
- `forester mv old.txt new.txt`
Errors:
- Wrong arity: `usage: mv <old> <new>`
- Flags not supported

branch
~~~~~~
Examples:
- `forester branch`
- `forester branch -v`
- `forester branch feature/login`
- `forester branch -d feature/login`
- `forester branch -m old new`
Errors:
- Unknown flag
- Extra args

switch
~~~~~~
Examples:
- `forester switch main`
- `forester switch -a feature/login`
- `forester switch HEAD~1`
Errors:
- Multiple targets
- Unknown flag

log
~~~
Examples:
- `forester log`
- `forester log --oneline -n 10`
- `forester log --since "2024-01-01"`
Errors:
- `--all` with branch arg
- `--name-only` with `--name-status`
- Unknown flag

show
~~~~
Examples:
- `forester show HEAD`
- `forester show abc123:file.txt`
Errors:
- Unknown flag
- Extra positional args

diff
~~~~
Examples:
- `forester diff`
- `forester diff --cached`
- `forester diff HEAD~1 HEAD`
Errors:
- `--cached` with commit args
- `--name-only` with `--name-status`
- Unknown flag

restore
~~~~~~~
Examples:
- `forester restore file.txt`
- `forester restore --staged file.txt`
- `forester restore --source=HEAD file.txt`
Errors:
- `--staged` with `--source`
- Unknown flag

restore-version
~~~~~~~~~~~~~~
Examples:
- `forester restore-version abc1234567890...`
- `forester restore-version HEAD~1`
Errors:
- Missing commit argument
- Commit not found

reset
~~~~~
Examples:
- `forester reset HEAD~1`
- `forester reset --hard <commit>`
Errors:
- Multiple commit hashes
- Conflicting mode flags

revert
~~~~~~
Examples:
- `forester revert HEAD~2`
Errors:
- Extra arguments

cherry-pick
~~~~~~~~~~~
Examples:
- `forester cherry-pick <commit>`
Errors:
- Extra arguments

merge
~~~~~
Examples:
- `forester merge feature/login`
- `forester merge --no-ff feature/login`
- `forester merge --abort`
Errors:
- `--abort` with other options
- `--no-ff` with `--ff-only`

move-to
~~~~~~~
Examples:
- `forester move-to main`
Errors:
- Extra arguments
- Unknown flag

tag
~~~
Examples:
- `forester tag`
- `forester tag -a -m "v1.0" v1.0`
- `forester tag -d v1.0`
Errors:
- `-m` without `-a`
- Extra args

stash
~~~~~
Examples:
- `forester stash`
- `forester stash save "WIP"`
- `forester stash pop`
- `forester stash drop <hash>`
Errors:
- Wrong arity for subcommands

clean
~~~~~
Examples:
- `forester clean -n`
- `forester clean -f -d`
Errors:
- `--dry-run` with `--force`
- Unknown flag

gc
~~
Examples:
- `forester gc`
- `forester gc --reflog-expire 30`
Errors:
- `--reflog-expire` without value
- Unknown flag

hook
~~~~
Examples:
- `forester hook`
- `forester hook install pre-commit ./script.sh`
- `forester hook remove pre-commit`
Errors:
- Wrong arity
- Unknown hook name

lock
~~~~
Examples:
- `forester lock file.blend`
- `forester lock file.blend --expire 4`
- `forester lock unlock file.blend`
Errors:
- `--shared` with `--exclusive`
- Unknown flag

config
~~~~~~
Examples:
- `forester config --list`
- `forester config --global user.name "Alice"`
Errors:
- Wrong arity

compare
~~~~~~~
Examples:
- `forester compare <full_hash>`
- `forester compare <hash1> <hash2>`
- `forester compare <hash> --cleanup`
Errors:
- Non-full hashes
- `--cleanup` with two commits

rebuild
~~~~~~~
Scan object store and report statistics.

Examples:
- `forester rebuild`
Errors:
- Extra arguments

review
~~~~~~
Examples:
- `forester review comment asset 123 "Looks good"`
- `forester review list asset 123`
- `forester review approve asset 123`
- `forester review reject asset 123 "Needs work"`
- `forester review resolve 42`
Errors:
- Wrong arity per subcommand

lol
~~~
Examples:
- `forester lol`
Errors:
- Extra arguments
