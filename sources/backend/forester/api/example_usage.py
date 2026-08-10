#!/usr/bin/env python3
"""
Example usage of Forester Structured C API from Python using ctypes
"""

import sys
import os

# Add the api directory to path
sys.path.insert(0, os.path.dirname(__file__))

from python_bindings_structured import ForesterAPI
import json


def main():
    # Initialize API
    # You can specify library path explicitly, or let it auto-detect
    library_path = os.path.join(os.path.dirname(__file__), "..", "build", "libforester.so")
    
    if not os.path.exists(library_path):
        print(f"Library not found at {library_path}")
        print("Please build the library first: cd forester && make build-lib")
        sys.exit(1)
    
    api = ForesterAPI(library_path)
    
    # Example: Initialize a repository
    repo_path = "/tmp/test_forester_api"
    if os.path.exists(repo_path):
        import shutil
        shutil.rmtree(repo_path)
    os.makedirs(repo_path)
    
    print("1. Initializing repository...")
    result = api.init(repo_path)
    print(f"   Result: {json.dumps(result, indent=2)}")
    
    # Example: Add files
    test_file = os.path.join(repo_path, "test.txt")
    with open(test_file, "w") as f:
        f.write("Hello, Forester!")
    
    print("\n2. Adding files...")
    result = api.add(repo_path, ["test.txt"])
    print(f"   Result: {json.dumps(result, indent=2)}")
    
    # Example: Get status
    print("\n3. Getting status...")
    status = api.get_status(repo_path)
    if status:
        print("   Status output:")
        print(json.dumps(status.to_dict(), indent=2))
    else:
        print("   Error: Failed to get status")
    
    # Example: Create commit
    print("\n4. Creating commit...")
    result = api.commit(repo_path, "Initial commit", "Test User")
    print(f"   Result: {json.dumps(result, indent=2)}")
    
    # Example: Get log
    print("\n5. Getting log...")
    commits = api.get_log(repo_path, max_count=10)
    if commits is not None:
        print("   Log output:")
        print(json.dumps([c.to_dict() for c in commits], indent=2))
    
    # Example: Get branches
    print("\n6. Getting branches...")
    branches = api.get_branches(repo_path)
    if branches is not None:
        print("   Branches:")
        print(json.dumps([b.to_dict() for b in branches], indent=2))
    
    print("\n✅ All examples completed successfully!")


if __name__ == "__main__":
    main()
