import { beforeEach } from 'vitest';

// jsdom keeps localStorage alive across the tests of a file. Anything a test
// persists (the designer saves its sample data there) would otherwise leak
// into the next one, and the outcome would depend on the order tests run in.
beforeEach(() => {
    localStorage.clear();
});
