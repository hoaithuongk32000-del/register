const t = require("ava");
const fs = require("fs-extra");
const path = require("path");
const { buildInternalEntry, buildReservedEntry, transformDomainItem, sortEntries } = require("../util/raw-api");

const internalDomains = require("../util/internal.json");
const reservedDomains = require("../util/reserved.json");

// --- Internal domains data structure ---

t("internal.json should be an array", (t) => {
    t.true(Array.isArray(internalDomains));
});

t("internal.json entries should be non-empty strings", (t) => {
    internalDomains.forEach((domain) => {
        t.is(typeof domain, "string");
        t.true(domain.length > 0, `Internal domain should not be empty`);
    });
});

t("internal.json should not contain duplicates", (t) => {
    const unique = new Set(internalDomains);
    t.is(unique.size, internalDomains.length, "Internal domains list contains duplicates");
});

// --- Reserved domains data structure ---

t("reserved.json should be an array", (t) => {
    t.true(Array.isArray(reservedDomains));
});

t("reserved.json entries should be non-empty strings", (t) => {
    reservedDomains.forEach((domain) => {
        t.is(typeof domain, "string");
        t.true(domain.length > 0, `Reserved domain should not be empty`);
    });
});

t("reserved.json should not contain duplicates", (t) => {
    const unique = new Set(reservedDomains);
    t.is(unique.size, reservedDomains.length, "Reserved domains list contains duplicates");
});

t("reserved.json entries should be lowercase", (t) => {
    reservedDomains.forEach((domain) => {
        t.is(domain, domain.toLowerCase(), `Reserved domain "${domain}" should be lowercase`);
    });
});

// --- Internal and reserved should not overlap ---

t("internal.json and reserved.json should not overlap", (t) => {
    const internalSet = new Set(internalDomains);
    const overlapping = reservedDomains.filter((d) => internalSet.has(d));
    t.is(overlapping.length, 0, `Overlapping domains: ${overlapping.join(", ")}`);
});

// --- Disallowed CNAMEs data structure ---

const disallowedCNAMEs = require("../util/disallowed-cnames.json");

t("disallowed-cnames.json should be an array", (t) => {
    t.true(Array.isArray(disallowedCNAMEs));
});

t("disallowed-cnames.json entries should be non-empty strings", (t) => {
    disallowedCNAMEs.forEach((cname) => {
        t.is(typeof cname, "string");
        t.true(cname.length > 0, `Disallowed CNAME should not be empty`);
    });
});

t("disallowed-cnames.json should not contain duplicates", (t) => {
    const unique = new Set(disallowedCNAMEs);
    t.is(unique.size, disallowedCNAMEs.length, "Disallowed CNAMEs list contains duplicates");
});

// --- Trusted users data structure ---

const trustedUsers = require("../util/trusted.json");

t("trusted.json should be an array", (t) => {
    t.true(Array.isArray(trustedUsers));
});

t("trusted.json entries should have required fields", (t) => {
    trustedUsers.forEach((user) => {
        t.is(typeof user.username, "string", "Each trusted user should have a username string");
        t.true(user.username.length > 0, "Username should not be empty");
        t.is(typeof user.id, "number", "Each trusted user should have a numeric id");
        t.true(Number.isInteger(user.id), "User id should be an integer");
        t.true(user.id > 0, "User id should be positive");
    });
});

t("trusted.json should not contain duplicate usernames", (t) => {
    const usernames = trustedUsers.map((u) => u.username.toLowerCase());
    const unique = new Set(usernames);
    t.is(unique.size, usernames.length, "Trusted users list contains duplicate usernames");
});

t("trusted.json should not contain duplicate ids", (t) => {
    const ids = trustedUsers.map((u) => u.id);
    const unique = new Set(ids);
    t.is(unique.size, ids.length, "Trusted users list contains duplicate ids");
});

t("trusted.json admin field should be boolean when present", (t) => {
    trustedUsers.forEach((user) => {
        if (user.hasOwnProperty("admin")) {
            t.is(typeof user.admin, "boolean", `${user.username}: admin field should be boolean`);
        }
    });
});

t("trusted.json should have at least one admin", (t) => {
    const admins = trustedUsers.filter((u) => u.admin);
    t.true(admins.length > 0, "There should be at least one admin in trusted users");
});

// --- Raw API exported functions ---

t("buildInternalEntry generates correct structure", (t) => {
    const entry = buildInternalEntry("docs");
    t.is(entry.domain, "docs.is-a.dev");
    t.is(entry.subdomain, "docs");
    t.is(entry.owner.username, "is-a-dev");
    t.deepEqual(entry.records, { CNAME: "internal.is-a.dev" });
    t.true(entry.internal);
});

t("buildInternalEntry works for all internal domains", (t) => {
    internalDomains.forEach((subdomain) => {
        const entry = buildInternalEntry(subdomain);
        t.is(entry.domain, `${subdomain}.is-a.dev`);
        t.is(entry.subdomain, subdomain);
        t.is(entry.owner.username, "is-a-dev");
        t.true(entry.internal);
    });
});

t("buildReservedEntry generates correct structure", (t) => {
    const entry = buildReservedEntry("admin");
    t.is(entry.domain, "admin.is-a.dev");
    t.is(entry.subdomain, "admin");
    t.is(entry.owner.username, "is-a-dev");
    t.deepEqual(entry.records, { URL: "https://is-a.dev/reserved" });
    t.true(entry.reserved);
});

t("buildReservedEntry works for all reserved domains", (t) => {
    reservedDomains.forEach((subdomain) => {
        const entry = buildReservedEntry(subdomain);
        t.is(entry.domain, `${subdomain}.is-a.dev`);
        t.is(entry.subdomain, subdomain);
        t.is(entry.owner.username, "is-a-dev");
        t.true(entry.reserved);
    });
});

t("transformDomainItem strips email from owner", (t) => {
    const mockItem = {
        owner: { username: "testuser", email: "test@example.com" },
        records: { A: ["1.2.3.4"] }
    };

    const result = transformDomainItem(mockItem, "mysite.json");
    t.is(result.owner.username, "testuser");
    t.is(result.owner.email, undefined);
});

t("transformDomainItem produces correct v2 structure with all fields", (t) => {
    const mockItem = {
        owner: { username: "testuser" },
        records: { CNAME: "example.com" },
        proxied: true,
        redirect_config: { redirect_paths: true }
    };

    const result = transformDomainItem(mockItem, "mysite.json");
    t.is(result.domain, "mysite.is-a.dev");
    t.is(result.subdomain, "mysite");
    t.deepEqual(result.owner, { username: "testuser" });
    t.deepEqual(result.records, { CNAME: "example.com" });
    t.true(result.proxied);
    t.deepEqual(result.redirect_config, { redirect_paths: true });
});

t("transformDomainItem omits optional fields when absent", (t) => {
    const mockItem = {
        owner: { username: "testuser" },
        records: { A: ["1.2.3.4"] }
    };

    const result = transformDomainItem(mockItem, "simple.json");
    t.is(result.domain, "simple.is-a.dev");
    t.false(result.hasOwnProperty("redirect_config"));
    t.false(result.hasOwnProperty("proxied"));
});

t("transformDomainItem handles nested subdomain file names", (t) => {
    const mockItem = {
        owner: { username: "testuser" },
        records: { A: ["1.2.3.4"] }
    };

    const result = transformDomainItem(mockItem, "sub.domain.json");
    t.is(result.domain, "sub.domain.is-a.dev");
    t.is(result.subdomain, "sub.domain");
});

t("sortEntries orders domains alphabetically by domain vs subdomain", (t) => {
    const entries = [
        { domain: "z.is-a.dev", subdomain: "z" },
        { domain: "a.is-a.dev", subdomain: "a" },
        { domain: "m.is-a.dev", subdomain: "m" }
    ];

    const sorted = sortEntries([...entries]);
    t.is(sorted[0].subdomain, "a");
    t.is(sorted[1].subdomain, "m");
    t.is(sorted[2].subdomain, "z");
});

t("sortEntries handles empty array", (t) => {
    const sorted = sortEntries([]);
    t.deepEqual(sorted, []);
});

t("sortEntries handles single element", (t) => {
    const entries = [{ domain: "test.is-a.dev", subdomain: "test" }];
    const sorted = sortEntries(entries);
    t.is(sorted.length, 1);
    t.is(sorted[0].subdomain, "test");
});
