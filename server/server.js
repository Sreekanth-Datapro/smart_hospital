require("dotenv").config();

const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

/* ==========================================
   CONFIGURATION
========================================== */

// Render provides PORT through environment variable.
// Local development: 3000
const PORT = process.env.PORT || 3000;

// SerpAPI key comes from .env locally
// and Render Environment Variables in production.
const SERPAPI_KEY = process.env.SERPAPI_KEY;

// Project root is one folder above the server folder.
const ROOT_DIR = path.join(__dirname, "..");

/* ==========================================
   MIME TYPES
========================================== */

const MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".webp": "image/webp",
    ".ico": "image/x-icon"
};

/* ==========================================
   SEND JSON RESPONSE
========================================== */

function sendJSON(response, statusCode, data) {
    response.writeHead(statusCode, {
        "Content-Type": "application/json; charset=utf-8",
        "Access-Control-Allow-Origin": "*"
    });

    response.end(JSON.stringify(data));
}

/* ==========================================
   HTTPS GET REQUEST
========================================== */

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        const request = https.get(url, (response) => {
            let data = "";

            response.on("data", (chunk) => {
                data += chunk;
            });

            response.on("end", () => {
                resolve({
                    statusCode: response.statusCode,
                    data: data
                });
            });
        });

        request.on("error", (error) => {
            reject(error);
        });
    });
}

/* ==========================================
   SERPAPI HOSPITAL API
========================================== */

async function handleHospitalAPI(requestURL, response) {
    try {

        /* --------------------------------------
           CHECK API KEY
        -------------------------------------- */

        if (!SERPAPI_KEY) {
            console.error("❌ SerpAPI key is missing.");

            sendJSON(response, 500, {
                error: "SerpAPI key is not configured."
            });

            return;
        }

        /* --------------------------------------
           GET QUERY PARAMETERS
        -------------------------------------- */

        const query = requestURL.searchParams.get("q");
        const lat = requestURL.searchParams.get("lat");
        const lng = requestURL.searchParams.get("lng");

        /* --------------------------------------
           DEFAULT SEARCH
        -------------------------------------- */

        let searchQuery = "hospitals";
        let ll = null;

        /* --------------------------------------
           LOCATION SEARCH
        -------------------------------------- */

        if (lat && lng) {
            searchQuery = query || "hospitals near me";

            ll = `@${lat},${lng},14z`;
        } else if (query) {
            searchQuery = query;
        }

        /* --------------------------------------
           BUILD SERPAPI PARAMETERS
        -------------------------------------- */

        const params = new URLSearchParams({
            engine: "google_maps",
            type: "search",
            q: searchQuery,
            api_key: SERPAPI_KEY,
            hl: "en",
            google_domain: "google.com"
        });

        /* --------------------------------------
           ADD LOCATION
        -------------------------------------- */

        if (ll) {
            params.set("ll", ll);
        }

        /* --------------------------------------
           SERPAPI URL
        -------------------------------------- */

        const serpApiURL =
            `https://serpapi.com/search.json?${params.toString()}`;

        /* --------------------------------------
           LOG REQUEST
        -------------------------------------- */

        console.log("");
        console.log("====================================");
        console.log("🏥 SERPAPI HOSPITAL REQUEST");
        console.log("====================================");
        console.log("Search:", searchQuery);

        if (ll) {
            console.log("Location:", ll);
        }

        /* --------------------------------------
           CALL SERPAPI
        -------------------------------------- */

        const result = await httpsGet(serpApiURL);

        console.log("SerpAPI HTTP:", result.statusCode);

        /* --------------------------------------
           PARSE RESPONSE
        -------------------------------------- */

        let json;

        try {
            json = JSON.parse(result.data);
        } catch (parseError) {

            console.error("❌ Invalid response from SerpAPI.");
            console.error(result.data);

            sendJSON(response, 502, {
                error: "Invalid response from SerpAPI."
            });

            return;
        }

        /* --------------------------------------
           SERPAPI ERROR
        -------------------------------------- */

        if (result.statusCode !== 200) {

            console.error("❌ SerpAPI returned an error:");
            console.error(json);

            sendJSON(
                response,
                result.statusCode,
                json
            );

            return;
        }

        /* --------------------------------------
           SUCCESS
        -------------------------------------- */

        console.log("✅ SerpAPI request successful.");

        sendJSON(response, 200, json);

    } catch (error) {

        console.error("❌ Hospital API Error:", error);

        sendJSON(response, 500, {
            error: "Hospital API request failed.",
            details: error.message
        });
    }
}

/* ==========================================
   STATIC FILE SERVER
========================================== */

function serveStaticFile(requestPath, response) {

    let cleanPath;

    /* --------------------------------------
       DECODE URL
    -------------------------------------- */

    try {
        cleanPath = decodeURIComponent(requestPath);
    } catch (error) {

        response.writeHead(400, {
            "Content-Type": "text/plain; charset=utf-8"
        });

        response.end("Bad Request");

        return;
    }

    /* --------------------------------------
       REMOVE LEADING SLASH
    -------------------------------------- */

    cleanPath = cleanPath.replace(/^\/+/, "");

    /* --------------------------------------
       DEFAULT PAGE
    -------------------------------------- */

    if (cleanPath === "") {
        cleanPath = "login.html";
    }

    /* --------------------------------------
       BUILD FILE PATH
    -------------------------------------- */

    const filePath = path.join(
        ROOT_DIR,
        cleanPath
    );

    /* --------------------------------------
       SECURITY CHECK
    -------------------------------------- */

    const normalizedRoot = path.resolve(ROOT_DIR);
    const normalizedFile = path.resolve(filePath);

    if (
        normalizedFile !== normalizedRoot &&
        !normalizedFile.startsWith(
            normalizedRoot + path.sep
        )
    ) {

        response.writeHead(403, {
            "Content-Type": "text/plain; charset=utf-8"
        });

        response.end("Forbidden");

        return;
    }

    /* --------------------------------------
       CHECK FILE
    -------------------------------------- */

    fs.stat(filePath, (error, stats) => {

        if (error) {

            console.log("404:", cleanPath);

            response.writeHead(404, {
                "Content-Type":
                    "text/plain; charset=utf-8"
            });

            response.end(
                "404 - File Not Found: " + cleanPath
            );

            return;
        }

        /* --------------------------------------
           DIRECTORY
        -------------------------------------- */

        if (stats.isDirectory()) {

            const indexFile = path.join(
                filePath,
                "login.html"
            );

            fs.readFile(
                indexFile,
                (indexError, content) => {

                    if (indexError) {

                        response.writeHead(403, {
                            "Content-Type":
                                "text/plain; charset=utf-8"
                        });

                        response.end(
                            "Directory access denied"
                        );

                        return;
                    }

                    response.writeHead(200, {
                        "Content-Type":
                            "text/html; charset=utf-8"
                    });

                    response.end(content);
                }
            );

            return;
        }

        /* --------------------------------------
           READ NORMAL FILE
        -------------------------------------- */

        fs.readFile(
            filePath,
            (readError, content) => {

                if (readError) {

                    console.error(
                        "❌ File read error:",
                        readError
                    );

                    response.writeHead(500, {
                        "Content-Type":
                            "text/plain; charset=utf-8"
                    });

                    response.end("Server Error");

                    return;
                }

                /* --------------------------------------
                   MIME TYPE
                -------------------------------------- */

                const extension =
                    path.extname(filePath).toLowerCase();

                const contentType =
                    MIME_TYPES[extension] ||
                    "application/octet-stream";

                /* --------------------------------------
                   SEND FILE
                -------------------------------------- */

                response.writeHead(200, {
                    "Content-Type": contentType,
                    "Cache-Control": "no-cache"
                });

                response.end(content);
            }
        );
    });
}

/* ==========================================
   CREATE HTTP SERVER
========================================== */

const server = http.createServer(
    async (request, response) => {

        try {

            /* --------------------------------------
               CORS / OPTIONS
            -------------------------------------- */

            if (request.method === "OPTIONS") {

                response.writeHead(204, {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods":
                        "GET, HEAD, OPTIONS",
                    "Access-Control-Allow-Headers":
                        "Content-Type"
                });

                response.end();

                return;
            }

            /* --------------------------------------
               REQUEST URL
            -------------------------------------- */

            const requestURL = new URL(
                request.url,
                `http://localhost:${PORT}`
            );

            const pathname =
                requestURL.pathname;

            console.log(
                `${request.method} ${pathname}`
            );

            /* --------------------------------------
               HOSPITAL API
            -------------------------------------- */

            if (pathname === "/api/hospitals") {

                if (
                    request.method !== "GET" &&
                    request.method !== "HEAD"
                ) {

                    response.writeHead(405, {
                        "Content-Type":
                            "text/plain; charset=utf-8",
                        "Access-Control-Allow-Origin":
                            "*"
                    });

                    response.end(
                        "Method Not Allowed"
                    );

                    return;
                }

                await handleHospitalAPI(
                    requestURL,
                    response
                );

                return;
            }

            /* --------------------------------------
               ONLY GET / HEAD FOR STATIC FILES
            -------------------------------------- */

            if (
                request.method !== "GET" &&
                request.method !== "HEAD"
            ) {

                response.writeHead(405, {
                    "Content-Type":
                        "text/plain; charset=utf-8"
                });

                response.end(
                    "Method Not Allowed"
                );

                return;
            }

            /* --------------------------------------
               STATIC FILES
            -------------------------------------- */

            serveStaticFile(
                pathname,
                response
            );

        } catch (error) {

            console.error(
                "❌ Server Error:",
                error
            );

            response.writeHead(500, {
                "Content-Type":
                    "text/plain; charset=utf-8"
            });

            response.end(
                "Internal Server Error"
            );
        }
    }
);

/* ==========================================
   START SERVER
========================================== */

server.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log("");
        console.log(
            "===================================="
        );
        console.log(
            "🏥 SMART HOSPITAL SERVER"
        );
        console.log(
            "===================================="
        );
        console.log(
            `🌐 Website: http://localhost:${PORT}`
        );
        console.log(
            `🏥 Hospital API: http://localhost:${PORT}/api/hospitals`
        );
        console.log(
            `📄 CSS: http://localhost:${PORT}/css/style.css`
        );
        console.log(
            `📜 JS: http://localhost:${PORT}/js/script.js`
        );

        console.log(
            "🔑 SerpAPI Key:",
            SERPAPI_KEY
                ? "Loaded"
                : "❌ Missing"
        );

        console.log(
            "===================================="
        );
        console.log("");
    }
);