const fs = require("fs");
const path = require("path");

function buildInternalEntry(subdomain) {
    return {
        domain: `${subdomain}.is-a.dev`,
        subdomain: subdomain,
        owner: {
            username: "is-a-dev"
        },
        records: {
            CNAME: "internal.is-a.dev"
        },
        internal: true
    };
}

function buildReservedEntry(subdomain) {
    return {
        domain: `${subdomain}.is-a.dev`,
        subdomain: subdomain,
        owner: {
            username: "is-a-dev"
        },
        records: {
            URL: "https://is-a.dev/reserved"
        },
        reserved: true
    };
}

function transformDomainItem(item, fileName) {
    const name = path.parse(fileName).name;

    item.domain = name + ".is-a.dev";
    item.subdomain = name;

    delete item.owner.email;

    let itemV2 = {
        domain: item.domain,
        subdomain: item.subdomain,
        owner: item.owner,
        records: item.records
    };

    if (item.redirect_config) itemV2.redirect_config = item.redirect_config;

    if (item.proxied) itemV2.proxied = item.proxied;

    return itemV2;
}

function sortEntries(entries) {
    return entries.sort((a, b) => a.domain.localeCompare(b.subdomain));
}

function generate() {
    const directoryPath = path.join(__dirname, "../domains");
    const outputDir = path.join(__dirname, "../raw-api");

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const internal = require(path.join(__dirname, "internal.json"));
    const reserved = require(path.join(__dirname, "reserved.json"));

    const v2 = [];

    for (const subdomain of internal) {
        v2.push(buildInternalEntry(subdomain));
    }

    for (const subdomain of reserved) {
        v2.push(buildReservedEntry(subdomain));
    }

    fs.readdir(directoryPath, function (err, files) {
        if (err) throw err;

        let processedCount = 0;

        files.forEach(function (file) {
            const filePath = path.join(directoryPath, file);

            fs.readFile(filePath, "utf8", (err, data) => {
                if (err) throw err;

                const item = JSON.parse(data);
                v2.push(transformDomainItem(item, file));

                processedCount++;
                if (processedCount === files.length) {
                    sortEntries(v2);

                    fs.writeFile("raw-api/v2.json", JSON.stringify(v2), (err) => {
                        if (err) throw err;
                    });
                }
            });
        });
    });
}

if (require.main === module) {
    generate();
}

module.exports = {
    buildInternalEntry,
    buildReservedEntry,
    transformDomainItem,
    sortEntries,
    generate
};
