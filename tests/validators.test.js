const t = require("ava");
const {
    expandIPv6,
    validateIPv4,
    validateIPv6,
    validateRecordType,
    isValidHostname,
    isValidHexadecimal,
    findDuplicateKeys,
    hostnameRegex,
    ipv4Regex,
    ipv6Regex,
    emailRegex
} = require("../util/validators");

// --- expandIPv6 ---

t("expandIPv6 expands a fully specified address", (t) => {
    const result = expandIPv6("2001:0db8:85a3:0000:0000:8a2e:0370:7334");
    t.is(result, "2001:0db8:85a3:0000:0000:8a2e:0370:7334");
});

t("expandIPv6 expands a compressed address with ::", (t) => {
    const result = expandIPv6("2001:db8::1");
    t.is(result, "2001:0db8:0000:0000:0000:0000:0000:0001");
});

t("expandIPv6 expands :: (all zeros)", (t) => {
    const result = expandIPv6("::1");
    t.is(result, "0000:0000:0000:0000:0000:0000:0000:0001");
});

t("expandIPv6 expands address with leading :: and multiple segments", (t) => {
    const result = expandIPv6("::ffff:192.168.1.1");
    // This passes through as segments
    t.truthy(result);
});

t("expandIPv6 pads short segments", (t) => {
    const result = expandIPv6("fe80:0:0:0:0:0:0:1");
    t.is(result, "fe80:0000:0000:0000:0000:0000:0000:0001");
});

t("expandIPv6 handles address with trailing ::", (t) => {
    const result = expandIPv6("2001:db8::");
    t.is(result, "2001:0db8:0000:0000:0000:0000:0000:0000");
});

// --- validateIPv4 ---

t("validateIPv4 accepts a valid public IPv4", (t) => {
    t.true(validateIPv4("8.8.8.8", false));
});

t("validateIPv4 accepts another valid public IPv4", (t) => {
    t.true(validateIPv4("1.1.1.1", false));
});

t("validateIPv4 rejects private 10.x.x.x range", (t) => {
    t.false(validateIPv4("10.0.0.1", false));
});

t("validateIPv4 rejects private 172.16-31.x.x range", (t) => {
    t.false(validateIPv4("172.16.0.1", false));
    t.false(validateIPv4("172.31.255.255", false));
});

t("validateIPv4 accepts 172.15.x.x (not private)", (t) => {
    t.true(validateIPv4("172.15.0.1", false));
});

t("validateIPv4 rejects private 192.168.x.x range", (t) => {
    t.false(validateIPv4("192.168.1.1", false));
});

t("validateIPv4 rejects CGNAT 100.64-127.x.x range", (t) => {
    t.false(validateIPv4("100.64.0.1", false));
    t.false(validateIPv4("100.127.255.255", false));
});

t("validateIPv4 accepts 100.63.x.x (below CGNAT range)", (t) => {
    t.true(validateIPv4("100.63.255.255", false));
});

t("validateIPv4 rejects link-local 169.254.x.x range", (t) => {
    t.false(validateIPv4("169.254.0.1", false));
});

t("validateIPv4 rejects documentation 192.0.2.x range (not proxied)", (t) => {
    t.false(validateIPv4("192.0.2.1", false));
});

t("validateIPv4 allows 192.0.2.1 when proxied", (t) => {
    t.true(validateIPv4("192.0.2.1", true));
});

t("validateIPv4 rejects benchmark 198.18.x.x range", (t) => {
    t.false(validateIPv4("198.18.0.1", false));
});

t("validateIPv4 rejects documentation 198.51.100.x range", (t) => {
    t.false(validateIPv4("198.51.100.1", false));
});

t("validateIPv4 rejects documentation 203.0.113.x range", (t) => {
    t.false(validateIPv4("203.0.113.1", false));
});

t("validateIPv4 rejects multicast 224+ range", (t) => {
    t.false(validateIPv4("224.0.0.1", false));
    t.false(validateIPv4("255.255.255.255", false));
});

t("validateIPv4 rejects invalid format (too few octets)", (t) => {
    t.false(validateIPv4("1.2.3", false));
});

t("validateIPv4 rejects invalid format (out of range octet)", (t) => {
    t.false(validateIPv4("256.1.1.1", false));
});

t("validateIPv4 rejects invalid format (non-numeric)", (t) => {
    t.false(validateIPv4("abc.def.ghi.jkl", false));
});

// --- validateIPv6 ---

t("validateIPv6 accepts a valid global unicast address", (t) => {
    t.true(validateIPv6("2001:0db8:85a3:0000:0000:8a2e:0370:7334"));
});

t("validateIPv6 rejects unique local fc00::/7 (fc prefix)", (t) => {
    t.false(validateIPv6("fc00:0000:0000:0000:0000:0000:0000:0001"));
});

t("validateIPv6 rejects unique local fc00::/7 (fd prefix)", (t) => {
    t.false(validateIPv6("fd00:0000:0000:0000:0000:0000:0000:0001"));
});

t("validateIPv6 rejects link-local fe80::", (t) => {
    t.false(validateIPv6("fe80:0000:0000:0000:0000:0000:0000:0001"));
});

t("validateIPv6 rejects loopback ::1", (t) => {
    t.false(validateIPv6("::1"));
});

t("validateIPv6 rejects documentation 2001:db8::", (t) => {
    t.false(validateIPv6("2001:db8:0000:0000:0000:0000:0000:0001"));
});

t("validateIPv6 accepts a valid public address", (t) => {
    t.true(validateIPv6("2606:4700:4700:0000:0000:0000:0000:1111"));
});

// --- validateRecordType ---

t("validateRecordType accepts all valid types", (t) => {
    const validTypes = ["A", "AAAA", "CAA", "CNAME", "DS", "MX", "NS", "SRV", "TLSA", "TXT", "URL"];
    validTypes.forEach((type) => {
        t.true(validateRecordType(type), `${type} should be valid`);
    });
});

t("validateRecordType rejects invalid types", (t) => {
    const invalidTypes = ["PTR", "SOA", "NAPTR", "DNSKEY", "RRSIG", "a", "cname", "", "INVALID"];
    invalidTypes.forEach((type) => {
        t.false(validateRecordType(type), `${type} should be invalid`);
    });
});

// --- isValidHostname ---

t("isValidHostname accepts valid hostnames", (t) => {
    const valid = [
        "example.com",
        "sub.example.com",
        "my-site.example.co.uk",
        "a.bc",
        "_dmarc.example.com",
        "very-long-subdomain-name.example.com"
    ];
    valid.forEach((h) => {
        t.true(isValidHostname(h), `${h} should be valid`);
    });
});

t("isValidHostname rejects invalid hostnames", (t) => {
    const invalid = [
        "example",
        "-example.com",
        "example-.com",
        ".example.com",
        "exam ple.com",
        "",
        "a.b"
    ];
    invalid.forEach((h) => {
        t.false(isValidHostname(h), `${h} should be invalid`);
    });
});

t("isValidHostname rejects hostnames exceeding 253 characters", (t) => {
    const longHostname = "a".repeat(64) + "." + "b".repeat(64) + "." + "c".repeat(64) + "." + "d".repeat(60) + ".com";
    t.false(isValidHostname(longHostname));
});

// --- isValidHexadecimal ---

t("isValidHexadecimal accepts valid hex strings", (t) => {
    t.true(isValidHexadecimal("0123456789abcdef"));
    t.true(isValidHexadecimal("ABCDEF"));
    t.true(isValidHexadecimal("aAbBcC"));
    t.true(isValidHexadecimal("0"));
});

t("isValidHexadecimal rejects invalid hex strings", (t) => {
    t.false(isValidHexadecimal(""));
    t.false(isValidHexadecimal("0x123"));
    t.false(isValidHexadecimal("ghij"));
    t.false(isValidHexadecimal("12 34"));
    t.false(isValidHexadecimal("12-34"));
});

// --- findDuplicateKeys ---

t("findDuplicateKeys returns empty for valid formatted JSON", (t) => {
    const json = '{\n    "name": "test",\n    "value": 123\n}';
    t.deepEqual(findDuplicateKeys(json), []);
});

t("findDuplicateKeys detects duplicate top-level keys in formatted JSON", (t) => {
    const json = '{\n    "name": "test",\n    "name": "other"\n}';
    t.deepEqual(findDuplicateKeys(json), ["name"]);
});

t("findDuplicateKeys detects duplicate nested keys in formatted JSON", (t) => {
    const json = '{\n    "owner": {\n        "username": "a",\n        "username": "b"\n    }\n}';
    t.deepEqual(findDuplicateKeys(json), ["username"]);
});

t("findDuplicateKeys handles multiple nested objects independently", (t) => {
    const json = '{\n    "a": {\n        "key": 1\n    },\n    "b": {\n        "key": 2\n    }\n}';
    t.deepEqual(findDuplicateKeys(json), []);
});

t("findDuplicateKeys detects duplicates in deeply nested formatted JSON", (t) => {
    const json = '{\n    "records": {\n        "A": ["1.2.3.4"],\n        "A": ["5.6.7.8"]\n    }\n}';
    t.deepEqual(findDuplicateKeys(json), ["A"]);
});

t("findDuplicateKeys returns empty for empty object", (t) => {
    t.deepEqual(findDuplicateKeys("{}"), []);
});

// --- Regex patterns ---

t("ipv4Regex matches valid IPv4 addresses", (t) => {
    t.regex("192.168.1.1", ipv4Regex);
    t.regex("0.0.0.0", ipv4Regex);
    t.regex("255.255.255.255", ipv4Regex);
    t.regex("8.8.8.8", ipv4Regex);
});

t("ipv4Regex does not match invalid IPv4 addresses", (t) => {
    t.notRegex("256.1.1.1", ipv4Regex);
    t.notRegex("1.2.3", ipv4Regex);
    t.notRegex("1.2.3.4.5", ipv4Regex);
    t.notRegex("abc.def.ghi.jkl", ipv4Regex);
});

t("ipv6Regex matches valid IPv6 addresses", (t) => {
    t.regex("2001:0db8:85a3:0000:0000:8a2e:0370:7334", ipv6Regex);
    t.regex("::1", ipv6Regex);
    t.regex("fe80::", ipv6Regex);
});

t("emailRegex matches valid emails", (t) => {
    t.regex("user@example.com", emailRegex);
    t.regex("test.name+tag@domain.co.uk", emailRegex);
    t.regex("a@b.cc", emailRegex);
});

t("emailRegex does not match invalid emails", (t) => {
    t.notRegex("@example.com", emailRegex);
    t.notRegex("user@", emailRegex);
    t.notRegex("user@.com", emailRegex);
    t.notRegex("", emailRegex);
});
