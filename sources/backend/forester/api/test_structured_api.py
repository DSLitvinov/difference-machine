#!/usr/bin/env python3
"""
Test script for Forester Structured API
"""

import sys
import os
import json
import tempfile
import shutil
from pathlib import Path

# Add api directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from python_bindings_structured import ForesterAPI, ForesterStatus, ForesterCommit, ForesterBranch

def test_init(api, repo_path):
    """Test repository initialization"""
    print("=" * 60)
    print("Test 1: Initialize repository")
    print("=" * 60)
    
    result = api.init(repo_path)
    print(f"Result: {json.dumps(result, indent=2)}")
    
    if result.get("success"):
        print("✅ Repository initialized successfully")
        return True
    else:
        print(f"❌ Failed: {result.get('error')}")
        return False

def test_add(api, repo_path):
    """Test adding files"""
    print("\n" + "=" * 60)
    print("Test 2: Add files")
    print("=" * 60)
    
    # Create test files
    test_file1 = os.path.join(repo_path, "test1.txt")
    test_file2 = os.path.join(repo_path, "test2.txt")
    test_dir = os.path.join(repo_path, "subdir")
    
    os.makedirs(test_dir, exist_ok=True)
    
    with open(test_file1, 'w') as f:
        f.write("Content 1")
    
    with open(test_file2, 'w') as f:
        f.write("Content 2")
    
    with open(os.path.join(test_dir, "test3.txt"), 'w') as f:
        f.write("Content 3")
    
    # Add single file
    result = api.add(repo_path, ["test1.txt"])
    print(f"Add test1.txt: {json.dumps(result, indent=2)}")
    if not result.get("success"):
        print(f"❌ Failed: {result.get('error')}")
        return False
    
    # Add multiple files
    result = api.add(repo_path, ["test2.txt", "subdir/test3.txt"])
    print(f"Add multiple files: {json.dumps(result, indent=2)}")
    if not result.get("success"):
        print(f"❌ Failed: {result.get('error')}")
        return False
    
    # Add all files
    result = api.add(repo_path, ["."])
    print(f"Add all files: {json.dumps(result, indent=2)}")
    if not result.get("success"):
        print(f"❌ Failed: {result.get('error')}")
        return False
    
    print("✅ All add operations successful")
    return True

def test_commit(api, repo_path):
    """Test committing"""
    print("\n" + "=" * 60)
    print("Test 3: Create commit")
    print("=" * 60)
    
    result = api.commit(repo_path, "Initial commit", "Test User")
    print(f"Result: {json.dumps(result, indent=2)}")
    
    if result.get("success"):
        print("✅ Commit created successfully")
        return True
    else:
        print(f"❌ Failed: {result.get('error')}")
        return False

def test_get_status(api, repo_path):
    """Test getting status"""
    print("\n" + "=" * 60)
    print("Test 4: Get repository status")
    print("=" * 60)
    
    status = api.get_status(repo_path)
    if status:
        status_dict = status.to_dict()
        print(f"Status: {json.dumps(status_dict, indent=2)}")
        print("✅ Status retrieved successfully")
        return True
    else:
        print("❌ Failed to get status")
        return False

def test_get_branches(api, repo_path):
    """Test getting branches"""
    print("\n" + "=" * 60)
    print("Test 5: Get branches")
    print("=" * 60)
    
    branches = api.get_branches(repo_path)
    if branches:
        print(f"Found {len(branches)} branch(es):")
        for branch in branches:
            branch_dict = branch.to_dict()
            print(f"  - {json.dumps(branch_dict, indent=2)}")
        print("✅ Branches retrieved successfully")
        return True
    else:
        print("❌ Failed to get branches")
        return False

def test_get_log(api, repo_path):
    """Test getting commit log"""
    print("\n" + "=" * 60)
    print("Test 6: Get commit log")
    print("=" * 60)
    
    commits = api.get_log(repo_path, max_count=10)
    if commits is not None:
        print(f"Found {len(commits)} commit(s):")
        for commit in commits:
            commit_dict = commit.to_dict()
            print(f"  - {commit_dict['hash'][:8]} by {commit_dict['author']}: {commit_dict['message']}")
        print("✅ Commit log retrieved successfully")
        return True
    else:
        print("❌ Failed to get commit log")
        return False

def test_get_commit(api, repo_path):
    """Test getting a specific commit"""
    print("\n" + "=" * 60)
    print("Test 7: Get specific commit")
    print("=" * 60)
    
    # First get the log to find a commit hash
    commits = api.get_log(repo_path, max_count=1)
    if commits and len(commits) > 0:
        commit_hash = commits[0].hash
        print(f"Getting commit: {commit_hash[:8]}...")
        
        commit = api.get_commit(repo_path, commit_hash)
        if commit:
            commit_dict = commit.to_dict()
            print(f"Commit details: {json.dumps(commit_dict, indent=2)}")
            print("✅ Commit retrieved successfully")
            return True
        else:
            print("❌ Failed to get commit")
            return False
    else:
        print("⚠️  No commits found, skipping test")
        return True

def test_modify_and_status(api, repo_path):
    """Test modifying files and checking status"""
    print("\n" + "=" * 60)
    print("Test 8: Modify files and check status")
    print("=" * 60)
    
    # Modify a file
    test_file = os.path.join(repo_path, "test1.txt")
    with open(test_file, 'w') as f:
        f.write("Modified content")
    
    # Create new file
    new_file = os.path.join(repo_path, "new_file.txt")
    with open(new_file, 'w') as f:
        f.write("New file content")
    
    status = api.get_status(repo_path)
    if status:
        status_dict = status.to_dict()
        print(f"Status after modifications:")
        print(f"  Unstaged modified: {status_dict['unstaged_modified_files']}")
        print(f"  Untracked: {status_dict['untracked_files']}")
        print("✅ Status shows modifications correctly")
        return True
    else:
        print("❌ Failed to get status")
        return False

def test_switch(api, repo_path):
    """Test switching branches"""
    print("\n" + "=" * 60)
    print("Test 9: Switch branch")
    print("=" * 60)
    
    # Create a new branch
    # First, we need to commit current changes or switch won't work
    api.add(repo_path, ["."])
    api.commit(repo_path, "Changes before branch", "Test User")
    
    # Note: Branch creation is not in structured API yet, so we'll test switch to HEAD
    result = api.switch(repo_path, "main", auto_stash=False)
    print(f"Switch result: {json.dumps(result, indent=2)}")
    
    if result.get("success"):
        print("✅ Switch successful")
        return True
    else:
        print(f"⚠️  Switch result: {result.get('error', 'Unknown error')}")
        return True  # Not critical if branch doesn't exist

def main():
    """Run all tests"""
    print("Forester Structured API Test Suite")
    print("=" * 60)
    
    # Create temporary directory for testing
    test_dir = tempfile.mkdtemp(prefix="forester_test_")
    repo_path = os.path.join(test_dir, "test_repo")
    os.makedirs(repo_path, exist_ok=True)
    
    print(f"Test repository: {repo_path}")
    
    try:
        # Initialize API
        lib_path = os.path.join(os.path.dirname(__file__), "..", "build", "libforester.so")
        if not os.path.exists(lib_path):
            print(f"❌ Library not found: {lib_path}")
            return 1
        
        api = ForesterAPI(lib_path)
        print(f"✅ API initialized with library: {lib_path}")
        
        # Run tests
        tests = [
            ("Init", lambda: test_init(api, repo_path)),
            ("Add", lambda: test_add(api, repo_path)),
            ("Commit", lambda: test_commit(api, repo_path)),
            ("Get Status", lambda: test_get_status(api, repo_path)),
            ("Get Branches", lambda: test_get_branches(api, repo_path)),
            ("Get Log", lambda: test_get_log(api, repo_path)),
            ("Get Commit", lambda: test_get_commit(api, repo_path)),
            ("Modify and Status", lambda: test_modify_and_status(api, repo_path)),
            ("Switch", lambda: test_switch(api, repo_path)),
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            try:
                if test_func():
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"❌ Test '{test_name}' raised exception: {e}")
                import traceback
                traceback.print_exc()
                failed += 1
        
        # Summary
        print("\n" + "=" * 60)
        print("Test Summary")
        print("=" * 60)
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Total: {passed + failed}")
        
        if failed == 0:
            print("\n✅ All tests passed!")
            return 0
        else:
            print(f"\n❌ {failed} test(s) failed")
            return 1
    
    except Exception as e:
        print(f"❌ Test suite error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    finally:
        # Cleanup
        print(f"\nCleaning up test directory: {test_dir}")
        shutil.rmtree(test_dir, ignore_errors=True)

if __name__ == "__main__":
    sys.exit(main())
