const t = require("ava");

const requiredRecordsToProxy = new Set(["A", "AAAA", "CNAME"]);

const { domainFiles: files, getDomainData } = require("./helpers");

function validateProxiedRecords(t, data, file) {
    const recordTypes = Array.from(requiredRecordsToProxy).join(", ");

    // Forcefully stop raw.is-a.dev from being proxied
    if (file === "raw.json") {
        t.true(!data.proxied, `${file}: raw.is-a.dev cannot be proxied`);
        return;
    }

    if (data.proxied) {
        const hasProxiedRecord = Object.keys(data.records).some((key) => requiredRecordsToProxy.has(key));

        t.true(
            hasProxiedRecord,
            `${file}: Proxied is true but there are no records that can be proxied (${recordTypes} expected)`
        );
    }
}


t("Domains with proxy enabled must have at least one proxy-able record", (t) => {
    files.forEach((file) => {
        const data = getDomainData(file);

        validateProxiedRecords(t, data, file);
    });
});

const disallowedRecords = [
    {
        type: "CNAME",
        value: "*.onrender.com"
    }
];

t("Domains with specific records must not have proxy enabled", (t) => {
    files.forEach((file) => {
        const data = getDomainData(file);

        if (data.proxied) {
            disallowedRecords.forEach((record) => {
                let recordExists = false;

                if (!data.records[record.type]) {
                    t.pass();
                    return;
                } else if (Array.isArray(data.records[record.type])) {
                    recordExists = data.records[record.type].some((r) =>
                        record.value.startsWith("*.") ? r.endsWith(record.value.slice(2)) : r === record.value
                    );
                } else {
                    recordExists = record.value.startsWith("*.")
                        ? data.records[record.type].endsWith(record.value.slice(2))
                        : data.records[record.type] === record.value;
                }

                t.false(
                    recordExists,
                    `${file}: Records matching \`${record.type}: "${record.value}"\` cannot be proxied`
                );
            });
        }
    });
});
