import { describe, it, expect } from 'vitest';
import { validateDocument } from './validate.js';

describe('validateDocument', () => {
    it('Accept a valid min document', () => {
        const doc = {
            schemaVersion: 1,
            page: { size: 'A4' },
            body: { type: 'text', value: 'Hi' },
        };
        const issues = validateDocument(doc);
        expect(issues).toEqual([]);
    });

    it('Report a document that is not a valid js object', () => {
        const issues = validateDocument('I\'m not a valid js object');
        expect(issues.length).toBeGreaterThan(0);
    });

    it('Report if a repeat node hasn\'t a template', () => {
        const doc = {
            schemaVersion: 1,
            page: { size: 'A4' },
            body: { type: 'repeat', dataSource: '$.items' },
        };
        const issues = validateDocument(doc);
        const templateIssue = issues.find((i) => i.path === '$.body');
        expect(templateIssue).toBeDefined();
    });
    it('Report if a group node hasn\'t a detail', () => {
        const doc = {
            schemaVersion: 1,
            page: { size: 'A4' },
            body: { type: 'group', dataSource: '$.items', groupBy: '.sub' },
        };
        const issues = validateDocument(doc);
        const templateIssue = issues.find((i) => i.path === '$.body');
        expect(templateIssue).toBeDefined();
    });
    it('Pass if a group node has a detail', () => {
        const doc = {
            schemaVersion: 1,
            page: { size: 'A4' },
            body: { type: 'group', dataSource: '$.items', groupBy: '.sub', detail: {
                type: 'text',
                value: ''
            } },
        };
        const issues = validateDocument(doc);
        expect(issues).toEqual([]);
    });
    it('Report if an image node hasn\'t a no src or bind', () => {
        const doc = {
            schemaVersion: 1,
            page: { size: 'A4' },
            body: { type: 'image' },
        };
        const issues = validateDocument(doc);
        const templateIssue = issues.find((i) => i.path === '$.body');
        expect(templateIssue).toBeDefined();
    });
    it('Pass if an image node has a src or bind property', () => {
        const doc = {
            schemaVersion: 1,
            page: { size: 'A4' },
            body: { type: 'image', src: 'image.png' },
        };
        const issues = validateDocument(doc);
        expect(issues).toEqual([]);
    });
    it('Report if a Stack Node node hasn\'t children', () => {
        const doc = {
            schemaVersion: 1,
            page: { size: 'A4' },
            body: { type: 'stack' },
        };
        const issues = validateDocument(doc);
        const templateIssue = issues.find((i) => i.path === '$.body');
        expect(templateIssue).toBeDefined();
    });
    it('Report if a Stack Node node hasn\'t valid children', () => {
        const doc = {
            schemaVersion: 1,
            page: { size: 'A4' },
            body: { type: 'stack', children: [{
                type: 'banana'
            }] },
        };
        const issues = validateDocument(doc);
        const templateIssue = issues.find((i) => i.path === '$.body.children[0]');
        expect(templateIssue).toBeDefined();
    });
    it('Pass if a Stack node has valid children', () => {
        const doc = {
            schemaVersion: 1,
            page: { size: 'A4' },
            body: { type: 'stack', children: [{
                type: 'text',
                value: 'Hi!'
            }] },
        };
        const issues = validateDocument(doc);
        expect(issues).toEqual([]);
    });

    it('Report if page.size is not a known value', () => {
        const doc = {
            schemaVersion: 1,
            page: { size: 'banana' },
            body: { type: 'text', value: 'Hi' },
        };
        const issues = validateDocument(doc);
        const issue = issues.find((i) => i.path === '$.page.size');
        expect(issue).toBeDefined();
    });

    it('Report if page.orientation is not a known value', () => {
        const doc = {
            schemaVersion: 1,
            page: { size: 'A4', orientation: 'sideways' },
            body: { type: 'text', value: 'Hi' },
        };
        const issues = validateDocument(doc);
        const issue = issues.find((i) => i.path === '$.page.orientation');
        expect(issue).toBeDefined();
    });

    it('Report if schemaVersion is newer than supported', () => {
        const doc = {
            schemaVersion: 999,
            page: { size: 'A4' },
            body: { type: 'text', value: 'Hi' },
        };
        const issues = validateDocument(doc);
        const issue = issues.find((i) => i.path === '$.schemaVersion');
        expect(issue).toBeDefined();
    });

    it('Report if stack.direction is not a known value', () => {
        const doc = {
            schemaVersion: 1,
            page: { size: 'A4' },
            body: { type: 'stack', direction: 'diagonal', children: [] },
        };
        const issues = validateDocument(doc);
        const issue = issues.find((i) => i.path === '$.body.direction');
        expect(issue).toBeDefined();
    });

    it('Report if a columns node has an unknown mode', () => {
        const doc = {
            schemaVersion: 1,
            page: { size: 'A4' },
            body: { type: 'columns', mode: 'sideways', children: [] },
        };
        const issues = validateDocument(doc);
        const issue = issues.find((i) => i.path === '$.body.mode');
        expect(issue).toBeDefined();
    });

    it('Pass if a columns node is well formed', () => {
        const doc = {
            schemaVersion: 1,
            page: { size: 'A4' },
            body: {
                type: 'columns',
                mode: 'independent',
                children: [
                    { type: 'text', value: 'a' },
                    { type: 'text', value: 'b' },
                ],
            },
        };
        const issues = validateDocument(doc);
        expect(issues).toEqual([]);
    });

    it('Report if regions.header is malformed', () => {
        const doc = {
            schemaVersion: 1,
            page: { size: 'A4' },
            body: { type: 'text', value: 'Hi' },
            regions: { header: { type: 'banana' } },
        };
        const issues = validateDocument(doc);
        const issue = issues.find((i) => i.path === '$.regions.header');
        expect(issue).toBeDefined();
    });

    it('Pass if regions are well formed', () => {
        const doc = {
            schemaVersion: 1,
            page: { size: 'A4' },
            body: { type: 'text', value: 'Hi' },
            regions: {
                header: { type: 'text', value: 'header' },
                footer: { type: 'text', value: 'footer' },
            },
        };
        const issues = validateDocument(doc);
        expect(issues).toEqual([]);
    });

    it('Report if group.breakInside is not a known value', () => {
        const doc = {
            schemaVersion: 1,
            page: { size: 'A4' },
            body: {
                type: 'group', dataSource: '$.items', groupBy: '.sub', breakInside: 'nope',
                detail: { type: 'text', value: '' },
            },
        };
        const issues = validateDocument(doc);
        const issue = issues.find((i) => i.path === '$.body.breakInside');
        expect(issue).toBeDefined();
    });

    it('Report if repeat.keepWithNext is not a boolean', () => {
        const doc = {
            schemaVersion: 1,
            page: { size: 'A4' },
            body: {
                type: 'repeat', dataSource: '$.items', keepWithNext: 'yes',
                template: { type: 'text', value: '' },
            },
        };
        const issues = validateDocument(doc);
        const issue = issues.find((i) => i.path === '$.body.keepWithNext');
        expect(issue).toBeDefined();
    });

    it('Pass if group has valid breakInside and keepWithNext', () => {
        const doc = {
            schemaVersion: 1,
            page: { size: 'A4' },
            body: {
                type: 'group', dataSource: '$.items', groupBy: '.sub',
                breakInside: 'avoid', keepWithNext: true,
                detail: { type: 'text', value: '' },
            },
        };
        const issues = validateDocument(doc);
        expect(issues).toEqual([]);
    });
});