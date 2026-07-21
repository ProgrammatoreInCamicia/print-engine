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
});