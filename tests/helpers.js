const fs = require("fs-extra");
const path = require("path");

const domainsPath = path.resolve("domains");

const domainFiles = fs.readdirSync(domainsPath).filter((file) => file.endsWith(".json"));

const hostnameRegex = /^(?=.{1,253}$)(?:(?:[_a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)\.)+[a-zA-Z]{2,63}$/;

const domainCache = {};

function getDomainData(fileOrSubdomain) {
    const file = fileOrSubdomain.endsWith(".json") ? fileOrSubdomain : `${fileOrSubdomain}.json`;

    if (domainCache[file]) {
        return domainCache[file];
    }

    try {
        const data = fs.readJsonSync(path.join(domainsPath, file));
        domainCache[file] = data;
        return data;
    } catch (error) {
        throw new Error(`Failed to read JSON for ${file}: ${error.message}`);
    }
}

function getSubdomain(file) {
    return file.replace(/\.json$/, "");
}

module.exports = {
    domainsPath,
    domainFiles,
    hostnameRegex,
    getDomainData,
    getSubdomain
};
