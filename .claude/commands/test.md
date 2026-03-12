Run the test suite. If a specific test file is provided as $ARGUMENTS, run only that file. Otherwise run all tests.

Steps:
1. Run: `pnpm test $ARGUMENTS`
2. If tests fail, read the failing test file and the source file it tests
3. Identify the root cause of each failure
4. Suggest specific fixes with code
