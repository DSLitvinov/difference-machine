# Difference Machine — Repository metadata storage

Forester stores repository metadata as **files under `.DFM/`**. There is no SQLite database.

Content (blobs, trees, commits) lives in the object store; refs, index, manifests, and other metadata are separate JSON or text files.

## Layout

```
.DFM/
├── objects/              # Unified content-addressable storage
│   └── ab/cdef...        # Object file; type is encoded in the object payload
├── refs/
│   ├── heads/            # Branch tips (one file per branch)
│   └── tags/             # Tag refs
├── HEAD                  # Current branch
├── index                 # Staging area (JSON: path → blob hash)
├── logs/refs/heads/      # Reflog (append-only text per branch)
├── manifests/            # Per-commit Blender object metadata (JSON)
├── reviews/
│   ├── comments/         # Review comments (JSON per asset)
│   └── approvals/        # Review approvals (JSON per asset)
├── locks/                # Collaborative file locks (JSON)
├── stash/                # Stash entries (JSON)
├── hooks/                # Git-like hooks
└── config                # Repository config
```

## Components

| Component | File(s) | Go package |
|-----------|---------|------------|
| Commits, trees, blobs | `.DFM/objects/<prefix>/<suffix>` | `internal/core/storage.go` |
| Branches, tags, HEAD | `.DFM/refs/`, `.DFM/HEAD` | `internal/core/refs.go` |
| Staging index | `.DFM/index` | `internal/core/index.go` |
| Reflog | `.DFM/logs/refs/heads/` | `internal/core/reflog.go` |
| Blender object registry | `.DFM/manifests/{commit}/{file}.json` | `internal/core/manifest_store.go` |
| Reviews | `.DFM/reviews/` | `internal/core/review_store.go` |
| Locks | `.DFM/locks/` | `internal/core/locking.go` |
| Stash | `.DFM/stash/` | `internal/core/stash_store.go` |

## Commit objects

Commits are typed JSON payloads in the unified object store. Fields include `hash`, `parent_hashes`, `tree_hash`, `author`, `message`, `timestamp`, `screenshot_path`, etc. Branch history is resolved by walking parent links from branch refs — not from a separate commits table.

## Manifests (object-level metadata)

Per-commit, per-file manifests under `.DFM/manifests/` track Blender scene objects (name, tags, mesh hash, etc.). Used by Mark To, Replace/Retrieve, and merge workflows.

## Maintenance

### `forester rebuild` / `repo.rebuild`

Scans the object store and reports counts (commits, trees, blobs). Does **not** rebuild a database — there is none. Use for diagnostics after corruption or manual `.DFM/objects/` edits.

```bash
forester rebuild
```

### Garbage collection

```bash
forester gc [--dry-run] [--reflog-expire <days>]
```

Removes unreachable objects from storage and expires old reflog entries.

### Backup

Copy the entire `.DFM/` directory (or the whole project root). All state is in plain files.

## Migration note

Older docs and addon UI referred to `.DFM/database.db` (SQLite). That layer was removed; metadata is file-based as described above.
