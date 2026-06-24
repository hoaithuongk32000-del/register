const t = require("ava");

const { domainFiles: files, getDomainData, getSubdomain } = require("./helpers");

t("Nested subdomains should not exist without a parent subdomain", (t) => {
    files.forEach((file) => {
        const subdomain = getSubdomain(file);
        const parts = subdomain.split(".");

        for (let i = 1; i < parts.length; i++) {
            const parent = parts.slice(i).join(".");
            if (parent.startsWith("_")) continue;

            t.true(files.includes(`${parent}.json`), `${file}: Parent subdomain "${parent}" does not exist`);
        }
    });
});

t("Nested subdomains should not exist if any parent subdomain has NS records", (t) => {
    files.forEach((file) => {
        const subdomain = getSubdomain(file);
        const parts = subdomain.split(".");

        for (let i = 1; i < parts.length; i++) {
            const parent = parts.slice(i).join(".");
            if (parent.startsWith("_") || !files.includes(`${parent}.json`)) continue;
            const parentData = getDomainData(parent);

            t.true(!parentData.records.NS, `${file}: Parent subdomain "${parent}" has NS records`);
        }
    });
});

t("Nested subdomains should be owned by the parent subdomain's owner", (t) => {
    files.forEach((file) => {
        const subdomain = getSubdomain(file);
        const parentDomain = subdomain.split(".").reverse()[0];

        if (parentDomain !== subdomain) {
            const data = getDomainData(subdomain);
            const parentData = getDomainData(parentDomain);

            t.true(
                data.owner.username.toLowerCase() === parentData.owner.username.toLowerCase(),
                `${file}: Owner does not match the parent subdomain`
            );
        }
    });
});

t("Users are limited to one single character subdomain", (t) => {
    const results = [];

    files.forEach((file) => {
        const subdomain = getSubdomain(file);
        const data = getDomainData(subdomain);

        if (subdomain.length === 1 && data.owner.username.toLowerCase() !== "is-a-dev") {
            results.push({
                subdomain,
                owner: data.owner.username.toLowerCase()
            });
        }
    });

    const duplicates = results.filter((result) => results.filter((r) => r.owner === result.owner).length > 1);
    const output = duplicates.reduce((acc, curr) => {
        if (!acc[curr.owner]) {
            acc[curr.owner] = [];
        }

        acc[curr.owner].push(`${curr.subdomain}.is-a.dev`);
        return acc;
    }, {});

    t.is(
        duplicates.length,
        0,
        Object.keys(output)
            .map((owner) => `${owner} - ${output[owner].join(", ")}`)
            .join("\n")
    );

    t.pass();
});
