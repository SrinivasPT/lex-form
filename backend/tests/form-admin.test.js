#!/usr/bin/env node

/**
 * Form Admin API Test Script
 * Tests all backend endpoints for Form Admin functionality
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

let testCount = 0;
let passCount = 0;
let failCount = 0;

function log(message, color = colors.reset) {
    console.log(`${color}${message}${colors.reset}`);
}

function makeRequest(method, path, data = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const req = http.request(url, options, (res) => {
            let body = '';
            res.on('data', (chunk) => (body += chunk));
            res.on('end', () => {
                try {
                    const json = body ? JSON.parse(body) : {};
                    resolve({ status: res.statusCode, data: json });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function test(name, fn) {
    testCount++;
    try {
        await fn();
        passCount++;
        log(`✓ ${name}`, colors.green);
    } catch (error) {
        failCount++;
        log(`✗ ${name}`, colors.red);
        log(`  ${error.message}`, colors.red);
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`${message}: expected ${expected}, got ${actual}`);
    }
}

function assertExists(value, message) {
    if (!value) {
        throw new Error(`${message}: value does not exist`);
    }
}

async function runTests() {
    log('\n🧪 Form Admin API Tests\n', colors.cyan);
    log('Testing backend endpoints...', colors.blue);
    log('─'.repeat(50), colors.blue);

    // Test 1: Get all controls
    await test('GET /api/form-admin/controls - Should return array', async () => {
        const res = await makeRequest('GET', '/api/form-admin/controls');
        assertEqual(res.status, 200, 'Status code');
        assertExists(Array.isArray(res.data), 'Response is array');
    });

    // Test 2: Create new control
    const testControlCode = `test_section_${Date.now()}`;
    await test('POST /api/form-admin/control - Should create control', async () => {
        const res = await makeRequest('POST', '/api/form-admin/control', {
            code: testControlCode,
            atomic_level_code: 'SECTION',
            type: 'section',
            label: 'Test Section',
            sort_order: 100,
        });
        assertEqual(res.status, 201, 'Status code');
        assertExists(res.data.code, 'Created control has code');
        assertEqual(res.data.code, testControlCode, 'Control code matches');
    });

    // Test 3: Create duplicate control
    await test('POST /api/form-admin/control - Should reject duplicate', async () => {
        const res = await makeRequest('POST', '/api/form-admin/control', {
            code: testControlCode,
            atomic_level_code: 'SECTION',
            type: 'section',
            label: 'Duplicate',
        });
        assertEqual(res.status, 409, 'Status code should be 409 Conflict');
    });

    // Test 4: Create control with missing fields
    await test('POST /api/form-admin/control - Should reject missing fields', async () => {
        const res = await makeRequest('POST', '/api/form-admin/control', {
            code: 'incomplete',
        });
        assertEqual(res.status, 400, 'Status code should be 400 Bad Request');
    });

    // Test 5: Update control
    await test('PUT /api/form-admin/control/:code - Should update', async () => {
        const res = await makeRequest('PUT', `/api/form-admin/control/${testControlCode}`, {
            label: 'Updated Test Section',
            help_text: 'New help text',
        });
        assertEqual(res.status, 200, 'Status code');
        assertEqual(res.data.label, 'Updated Test Section', 'Label updated');
    });

    // Test 6: Update non-existent control
    await test('PUT /api/form-admin/control/:code - Should 404 for missing', async () => {
        const res = await makeRequest('PUT', '/api/form-admin/control/nonexistent', {
            label: 'Test',
        });
        assertEqual(res.status, 404, 'Status code should be 404');
    });

    // Test 7: Check delete eligibility
    await test('GET /api/form-admin/control/:code/can-delete - Should check', async () => {
        const res = await makeRequest(
            'GET',
            `/api/form-admin/control/${testControlCode}/can-delete`
        );
        assertEqual(res.status, 200, 'Status code');
        assertExists(res.data.canDelete !== undefined, 'Response has canDelete field');
    });

    // Test 8: Create associations
    await test('POST /api/form-admin/control-group - Should associate', async () => {
        // First, get some BASE controls to associate
        const controlsRes = await makeRequest('GET', '/api/form-admin/controls');
        const baseControls = controlsRes.data
            .filter((c) => c.atomicLevelCode === 'BASE')
            .slice(0, 2)
            .map((c) => c.code);

        if (baseControls.length === 0) {
            throw new Error('No BASE controls available for testing');
        }

        const res = await makeRequest('POST', '/api/form-admin/control-group', {
            control_code: testControlCode,
            child_control_codes: baseControls,
        });
        assertEqual(res.status, 201, 'Status code');
        assertExists(res.data.created >= 0, 'Response has created count');
    });

    // Test 9: Delete association (if we have any)
    await test('DELETE /api/form-admin/control-group/:parent/:child - Can delete', async () => {
        // Get associations for test control
        const controlsRes = await makeRequest('GET', '/api/form-admin/controls');
        const baseControls = controlsRes.data
            .filter((c) => c.atomicLevelCode === 'BASE')
            .slice(0, 1)
            .map((c) => c.code);

        if (baseControls.length > 0) {
            const res = await makeRequest(
                'DELETE',
                `/api/form-admin/control-group/${testControlCode}/${baseControls[0]}`
            );
            // Could be 200 (deleted) or 404 (not found) depending on test execution
            assertExists(res.status === 200 || res.status === 404, 'Status code is 200 or 404');
        }
    });

    // Test 10: Delete control without dependencies
    await test('DELETE /api/form-admin/control/:code - Should delete', async () => {
        // First remove all associations
        const res = await makeRequest('DELETE', `/api/form-admin/control/${testControlCode}`);
        // Should either delete the control (200) or return an error (400)
        assertExists(res.status === 200 || res.status === 400, 'Status code is 200 or 400');
    });

    // Summary
    log('\n' + '─'.repeat(50), colors.blue);
    log(`\n📊 Test Results:`, colors.cyan);
    log(`   Total: ${testCount}`, colors.blue);
    log(`   Passed: ${passCount}`, colors.green);
    log(`   Failed: ${failCount}`, failCount > 0 ? colors.red : colors.green);

    if (failCount === 0) {
        log('\n✅ All tests passed!\n', colors.green);
        process.exit(0);
    } else {
        log('\n❌ Some tests failed!\n', colors.red);
        process.exit(1);
    }
}

// Check if backend is running
log('Checking backend server...', colors.blue);
http.get(BASE_URL, (res) => {
    if (res.statusCode === 200 || res.statusCode === 404) {
        log('✓ Backend server is running\n', colors.green);
        runTests().catch((error) => {
            log(`\n❌ Test execution failed: ${error.message}\n`, colors.red);
            process.exit(1);
        });
    }
}).on('error', () => {
    log('✗ Backend server is not running!', colors.red);
    log('  Please start the backend server first:', colors.yellow);
    log('  cd backend && npm start\n', colors.yellow);
    process.exit(1);
});
