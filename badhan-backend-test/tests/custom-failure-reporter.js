/*
 * Custom Jest reporter that writes a txt file for every individual test.
 *  - On success: logs/success/<index>-<path>_<testTitle>_success.txt
 *  - On failure: logs/error/<index>-<path>_<testTitle>_<failureType>.txt
 * Directories `logs/error` and `logs/success` are expected to be cleared
 * once per test run by the start script.
 */
const fs = require('fs');
const path = require('path');

// Remove ANSI color codes so log files remain plain text without escape sequences.
const stripAnsi = (s) => (typeof s === 'string' ? s.replace(/\u001b\[[0-9;]*m/g, '') : s);

function sanitize(str) {
	return str
		.replace(/[\n\r]/g, ' ')
		.replace(/\s+/g, ' ') // collapse whitespace
		.replace(/[^a-zA-Z0-9._-]+/g, '_')
		.slice(0, 120);
}

class PerTestLogReporter {
	constructor(globalConfig, options) {
		this._globalConfig = globalConfig;
		this._options = options || {};
		this._projectRoot = (globalConfig && globalConfig.rootDir) ? globalConfig.rootDir : path.join(__dirname, '..');
		this._root = path.join(this._projectRoot, 'logs');
		this._successDir = path.join(this._root, 'success');
		this._errorDir = path.join(this._root, 'error');
		// Directories are cleared in start script; ensure they exist now.
		[this._root, this._successDir, this._errorDir].forEach((d) => {
			if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
		});
		this._counter = 0;
		this._testRunStarted = false;
	}

	onRunStart(aggregatedResult, options) {
		// Override Jest's default "Determining test suites to run" message
		process.stdout.write('Tests are running...\n');
		this._testRunStarted = true;
	}

	onTestResult(test, testResult, aggregatedResult) {
		const relativePath = path.relative(this._projectRoot, test.path);
		testResult.testResults.forEach((tr) => {
			const idx = String(++this._counter).padStart(3, '0');
			const baseName = `${idx}-${sanitize(relativePath)}_${sanitize(tr.title)}`;
			if (tr.status === 'passed') {
				const filePath = path.join(this._successDir, `${baseName}_success.txt`);
				const content = [
					`TEST: ${stripAnsi(tr.title)}`,
					`FILE: ${relativePath}`,
					`STATUS: SUCCESS`,
					`DURATION_MS: ${tr.duration}`,
					''
				].join('\n');
				fs.writeFileSync(filePath, content, 'utf8');
			} else if (tr.status === 'failed') {
				const failureMessages = (tr.failureMessages || []).map(stripAnsi);
				// Derive a short failure tag from first message
				let failureTag = 'failure';
				if (failureMessages[0]) {
					const firstLine = failureMessages[0].split(/\n/)[0];
						failureTag = sanitize(firstLine).slice(0, 60) || failureTag;
				}
				const filePath = path.join(this._errorDir, `${baseName}_${failureTag}.txt`);
				const content = [
					`TEST: ${stripAnsi(tr.title)}`,
					`FILE: ${relativePath}`,
					`STATUS: FAILURE`,
					`DURATION_MS: ${tr.duration}`,
					`NUM_ASSERTION_FAILURES: ${tr.numPassingAsserts}`,
					'--- FAILURE MESSAGES ---',
					...failureMessages,
					''
				].join('\n');
				fs.writeFileSync(filePath, content, 'utf8');
			} else if (tr.status === 'skipped' || tr.status === 'pending' || tr.status === 'todo') {
				// Could optionally log skipped tests; ignoring for brevity.
			}
		});
	}

	onRunComplete(contexts, aggregatedResult) {
		// Multi-line summary (one metric per line) without detailed failure info.
		const { numFailedTests, numPassedTests, numPendingTests, numTodoTests, numTotalTests, startTime } = aggregatedResult;
		const durationMs = Date.now() - startTime;
		let summary = 'Test Summary =>\n';
		summary += `Total: ${numTotalTests}\n`;
		summary += `Passed: ${numPassedTests}\n`;
		summary += `Failed: ${numFailedTests}\n`;
		if (numPendingTests) summary += `Pending: ${numPendingTests}\n`;
		if (numTodoTests) summary += `Todo: ${numTodoTests}\n`;
		summary += `Duration(ms): ${durationMs}\n`;
		process.stdout.write(summary);
	}
}

module.exports = PerTestLogReporter;
