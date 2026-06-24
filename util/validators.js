const hostnameRegex = /^(?=.{1,253}$)(?:(?:[_a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)\.)+[a-zA-Z]{2,63}$/;
const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])(\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])){3}$/;
const ipv6Regex =
    /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){1,7}:$|^(?:[0-9a-fA-F]{1,4}:){0,6}::(?:[0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}$/;
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function expandIPv6(ip) {
    let segments = ip.split(":");
    const emptyIndex = segments.indexOf("");

    if (emptyIndex !== -1) {
        const nonEmptySegments = segments.filter((seg) => seg !== "");
        const missingSegments = 8 - nonEmptySegments.length;

        segments = [
            ...nonEmptySegments.slice(0, emptyIndex),
            ...Array(missingSegments).fill("0000"),
            ...nonEmptySegments.slice(emptyIndex)
        ];
    }

    return segments.map((segment) => segment.padStart(4, "0")).join(":");
}

function validateIPv4(ip, proxied) {
    const parts = ip.split(".").map(Number);

    if (parts.length !== 4 || parts.some((part) => isNaN(part) || part < 0 || part > 255)) return false;
    if (ip === "192.0.2.1" && proxied) return true;

    return !(
        parts[0] === 10 ||
        (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
        (parts[0] === 192 && parts[1] === 168) ||
        (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) ||
        (parts[0] === 169 && parts[1] === 254) ||
        (parts[0] === 192 && parts[1] === 0 && parts[2] === 0) ||
        (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) ||
        (parts[0] === 198 && parts[1] === 18) ||
        (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) ||
        (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) ||
        parts[0] >= 224
    );
}

function validateIPv6(ip) {
    return !(
        ip.toLowerCase().startsWith("fc") ||
        ip.toLowerCase().startsWith("fd") ||
        ip.toLowerCase().startsWith("fe80") ||
        ip.toLowerCase().startsWith("::1") ||
        ip.toLowerCase().startsWith("2001:db8")
    );
}

function validateRecordType(recordType) {
    const validRecordTypes = new Set(["A", "AAAA", "CAA", "CNAME", "DS", "MX", "NS", "SRV", "TLSA", "TXT", "URL"]);
    return validRecordTypes.has(recordType);
}

function isValidHostname(hostname) {
    return hostnameRegex.test(hostname);
}

function isValidHexadecimal(value) {
    return /^[0-9a-fA-F]+$/.test(value);
}

function findDuplicateKeys(jsonString) {
    const duplicateKeys = new Set();
    const keyStack = [];

    const keyRegex = /"(.*?)"\s*:/g;

    let i = 0;
    while (i < jsonString.length) {
        const char = jsonString[i];

        if (char === "{") {
            keyStack.push({});
            i++;
            continue;
        }

        if (char === "}") {
            keyStack.pop();
            i++;
            continue;
        }

        keyRegex.lastIndex = i;
        const match = keyRegex.exec(jsonString);
        if (match && match.index === i && keyStack.length > 0) {
            const key = match[1];
            const currentScope = keyStack[keyStack.length - 1];

            if (currentScope[key]) {
                duplicateKeys.add(key);
            } else {
                currentScope[key] = true;
            }

            i = keyRegex.lastIndex;
        } else {
            i++;
        }
    }

    return [...duplicateKeys];
}

module.exports = {
    hostnameRegex,
    ipv4Regex,
    ipv6Regex,
    emailRegex,
    expandIPv6,
    validateIPv4,
    validateIPv6,
    validateRecordType,
    isValidHostname,
    isValidHexadecimal,
    findDuplicateKeys
};
