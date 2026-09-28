/* ==========================================
   SMART HOSPITAL JAVASCRIPT
   GPS + SERPAPI + HOSPITAL SEARCH
========================================== */


let userLatitude = null;
let userLongitude = null;


/* ==========================================
   PAGE LOAD TEST
========================================== */

console.log(
    "✅ SMART HOSPITAL JavaScript loaded successfully"
);


/* ==========================================
   GET CURRENT LOCATION
========================================== */

function getLocation() {

    const status =
        document.getElementById("locationStatus");


    if (!navigator.geolocation) {

        status.innerHTML =
            "❌ Your browser does not support GPS.";

        return;
    }


    status.innerHTML =
        "📍 Detecting your location...";


    navigator.geolocation.getCurrentPosition(

        function(position) {

            userLatitude =
                position.coords.latitude;

            userLongitude =
                position.coords.longitude;


            console.log(
                "GPS:",
                userLatitude,
                userLongitude
            );


            status.innerHTML = `
                ✅ Location detected successfully!
                <br>
                Latitude:
                ${userLatitude.toFixed(5)}
                <br>
                Longitude:
                ${userLongitude.toFixed(5)}
                <br><br>
                🔎 Searching real hospitals...
            `;


            searchNearbyHospitals();

        },


        function(error) {

            console.error(
                "GPS Error:",
                error
            );


            if (error.code === 1) {

                status.innerHTML =
                    "❌ Location permission denied. Please allow location access.";

            }

            else if (error.code === 2) {

                status.innerHTML =
                    "❌ Location unavailable.";

            }

            else {

                status.innerHTML =
                    "❌ Location request timed out.";

            }

        },


        {

            enableHighAccuracy: true,

            timeout: 15000,

            maximumAge: 0

        }

    );

}


/* ==========================================
   SEARCH NEARBY HOSPITALS
========================================== */

async function searchNearbyHospitals() {

    if (
        userLatitude === null ||
        userLongitude === null
    ) {

        showError(
            "Please enable your location first."
        );

        return;
    }


    showLoading();


    try {

        const url =
            `/api/hospitals?lat=${encodeURIComponent(
                userLatitude
            )}&lng=${encodeURIComponent(
                userLongitude
            )}`;


        console.log(
            "Nearby hospital request:",
            url
        );


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                "Server returned HTTP " +
                response.status
            );

        }


        const data =
            await response.json();


        console.log(
            "SerpApi Response:",
            data
        );


        if (
            data.error
        ) {

            throw new Error(
                data.error
            );

        }


        displayHospitals(
            data.local_results || []
        );


    }

    catch (error) {

        console.error(
            "Hospital API Error:",
            error
        );


        showError(
            "Unable to load real hospital data. " +
            error.message
        );

    }

}


/* ==========================================
   SEARCH HOSPITALS
========================================== */

async function searchHospitals() {

    console.log(
        "🔎 searchHospitals() called"
    );


    const input =
        document.getElementById(
            "searchInput"
        );


    if (!input) {

        console.error(
            "searchInput element not found"
        );

        return;
    }


    const query =
        input.value.trim();


    if (query === "") {

        alert(
            "Enter a hospital name or location."
        );

        return;
    }


    showLoading();


    try {

        let url =
            `/api/hospitals?q=${encodeURIComponent(
                query
            )}`;


        /*
         * If GPS is available,
         * also send GPS coordinates.
         */

        if (
            userLatitude !== null &&
            userLongitude !== null
        ) {

            url +=
                `&lat=${encodeURIComponent(
                    userLatitude
                )}` +
                `&lng=${encodeURIComponent(
                    userLongitude
                )}`;

        }


        console.log(
            "Search URL:",
            url
        );


        const response =
            await fetch(url);


        if (!response.ok) {

            throw new Error(
                "Search request failed: HTTP " +
                response.status
            );

        }


        const data =
            await response.json();


        console.log(
            "Search Response:",
            data
        );


        if (data.error) {

            throw new Error(
                data.error
            );

        }


        displayHospitals(
            data.local_results || []
        );


    }

    catch (error) {

        console.error(
            "Hospital Search Error:",
            error
        );


        showError(
            "Unable to search hospitals. " +
            error.message
        );

    }

}


/* ==========================================
   QUICK SEARCH
========================================== */

function quickSearch(query) {

    const input =
        document.getElementById(
            "searchInput"
        );


    input.value = query;


    searchHospitals();

}


/* ==========================================
   DISPLAY HOSPITALS
========================================== */

function displayHospitals(hospitals) {

    const container =
        document.getElementById(
            "hospitalContainer"
        );


    if (!container) {

        console.error(
            "hospitalContainer not found"
        );

        return;
    }


    container.innerHTML = "";


    if (
        !hospitals ||
        hospitals.length === 0
    ) {

        container.innerHTML = `

            <div class="empty-card">

                <h3>
                    ❌ No hospitals found
                </h3>

                <p>
                    Try another hospital name or location.
                </p>

            </div>

        `;

        return;
    }


    hospitals.forEach(
        function(hospital) {


            const name =
                hospital.title ||
                "Hospital";


            const address =
                hospital.address ||
                "Address unavailable";


            const phone =
                hospital.phone ||
                "";


            const rating =
                hospital.rating ??
                "N/A";


            const image =
                hospital.thumbnail ||
                createHospitalPlaceholder();


            let latitude =
                null;


            let longitude =
                null;


            if (
                hospital.gps_coordinates
            ) {

                latitude =
                    hospital
                        .gps_coordinates
                        .latitude;


                longitude =
                    hospital
                        .gps_coordinates
                        .longitude;

            }


            let distanceText =
                "Distance unavailable";


            if (

                latitude !== null &&

                longitude !== null &&

                userLatitude !== null &&

                userLongitude !== null

            ) {

                const distance =
                    calculateDistance(

                        userLatitude,

                        userLongitude,

                        latitude,

                        longitude

                    );


                distanceText =
                    distance.toFixed(2) +
                    " km away";

            }


            let directions =
                "#";


            if (

                latitude !== null &&

                longitude !== null

            ) {

                directions =
                    `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

            }


            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "hospital-card";


            const safeName =
                escapeHTML(name);


            const safeAddress =
                escapeHTML(address);


            const safePhone =
                escapeHTML(phone);


            const safeImage =
                escapeHTML(image);


            let buttons = "";


            if (phone) {

                const phoneNumber =
                    phone.replace(
                        /[^0-9+]/g,
                        ""
                    );


                buttons += `

                    <a
                        class="call-btn"
                        href="tel:${phoneNumber}"
                    >
                        📞 Call
                    </a>

                `;

            }


            if (
                directions !== "#"
            ) {

                buttons += `

                    <a
                        class="direction-btn"
                        href="${directions}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        🗺️ Directions
                    </a>

                `;

            }


            card.innerHTML = `

                <img
                    class="hospital-image"
                    src="${safeImage}"
                    alt="${safeName}"
                    onerror="
                        this.src=createHospitalPlaceholder()
                    "
                >


                <div class="hospital-info">

                    <h3>
                        🏥 ${safeName}
                    </h3>


                    <p>
                        📍 ${safeAddress}
                    </p>


                    <p>
                        📞 ${
                            safePhone ||
                            "Phone unavailable"
                        }
                    </p>


                    <p>
                        ⭐ Rating:
                        ${escapeHTML(
                            String(rating)
                        )}
                    </p>


                    <p>
                        📏 ${distanceText}
                    </p>


                    <div
                        class="hospital-buttons"
                    >

                        ${buttons}

                    </div>

                </div>

            `;


            container.appendChild(
                card
            );

        }
    );

}


/* ==========================================
   PLACEHOLDER IMAGE
========================================== */

function createHospitalPlaceholder() {

    return "data:image/svg+xml;charset=UTF-8," +
        encodeURIComponent(`

            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="800"
                height="450"
                viewBox="0 0 800 450"
            >

                <rect
                    width="800"
                    height="450"
                    fill="#dff8fa"
                />

                <text
                    x="400"
                    y="210"
                    text-anchor="middle"
                    font-size="90"
                >
                    🏥
                </text>

                <text
                    x="400"
                    y="300"
                    text-anchor="middle"
                    font-family="Arial"
                    font-size="32"
                    fill="#087f8c"
                >
                    Smart Hospital
                </text>

            </svg>

        `);

}


/* ==========================================
   DISTANCE CALCULATION
========================================== */

function calculateDistance(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const R = 6371;


    const dLat =
        toRadians(
            lat2 - lat1
        );


    const dLon =
        toRadians(
            lon2 - lon1
        );


    const a =

        Math.sin(
            dLat / 2
        ) ** 2 +

        Math.cos(
            toRadians(lat1)
        ) *

        Math.cos(
            toRadians(lat2)
        ) *

        Math.sin(
            dLon / 2
        ) ** 2;


    const c =

        2 *

        Math.atan2(

            Math.sqrt(a),

            Math.sqrt(
                1 - a
            )

        );


    return R * c;

}


function toRadians(value) {

    return value *
        Math.PI /
        180;

}


/* ==========================================
   LOADING
========================================== */

function showLoading() {

    const container =
        document.getElementById(
            "hospitalContainer"
        );


    if (!container) {

        return;
    }


    container.innerHTML = `

        <div class="empty-card">

            <h3>
                🔄 Searching...
            </h3>

            <p>
                Getting real hospital information
                from SerpApi.
            </p>

        </div>

    `;

}


/* ==========================================
   ERROR
========================================== */

function showError(message) {

    const container =
        document.getElementById(
            "hospitalContainer"
        );


    if (!container) {

        return;
    }


    container.innerHTML = `

        <div class="empty-card">

            <h3>
                ❌ Error
            </h3>

            <p>
                ${escapeHTML(message)}
            </p>

        </div>

    `;

}


/* ==========================================
   DOCTOR CONSULTATION
========================================== */

function consultDoctor(doctor) {

    const doctorInput =
        document.getElementById(
            "doctorName"
        );


    if (doctorInput) {

        doctorInput.value =
            doctor;

    }


    const appointment =
        document.getElementById(
            "appointment"
        );


    if (appointment) {

        appointment.scrollIntoView({

            behavior: "smooth"

        });

    }

}


/* ==========================================
   HEALTH CHECKER
========================================== */

function checkProblem() {

    const input =
        document.getElementById(
            "problemInput"
        );


    const result =
        document.getElementById(
            "healthResult"
        );


    const problem =
        input.value
            .toLowerCase()
            .trim();


    if (!problem) {

        result.innerHTML = `

            <h3>
                ⚠️ Please enter symptoms
            </h3>

            <p>
                Enter your symptoms to receive
                general health information.
            </p>

        `;

        return;
    }


    if (
        problem.includes("chest pain") ||
        problem.includes("heart attack") ||
        problem.includes("breathing difficulty") ||
        problem.includes("difficulty breathing")
    ) {

        result.innerHTML = `

            <h3>
                🚨 Emergency Warning
            </h3>

            <p>
                Chest pain or severe breathing difficulty
                can require urgent medical attention.
            </p>

            <p>
                Please contact emergency medical services
                or visit the nearest emergency department.
            </p>

        `;

        return;
    }


    if (
        problem.includes("fever")
    ) {

        result.innerHTML = `

            <h3>
                🌡️ Fever Information
            </h3>

            <p>
                Fever can have many causes.
                Stay hydrated and take adequate rest.
            </p>

            <p>
                Consult a qualified doctor if symptoms
                are severe, persistent or worsening.
            </p>

        `;

    }


    else if (
        problem.includes("headache")
    ) {

        result.innerHTML = `

            <h3>
                🤕 Headache Information
            </h3>

            <p>
                Headaches can have many causes.
                Rest and hydration may help.
            </p>

            <p>
                Seek medical advice if the headache
                is severe or persistent.
            </p>

        `;

    }


    else if (
        problem.includes("cold") ||
        problem.includes("cough")
    ) {

        result.innerHTML = `

            <h3>
                🤧 Cold / Cough Information
            </h3>

            <p>
                Rest and drink adequate fluids.
            </p>

            <p>
                Consult a qualified doctor if symptoms
                become severe or persistent.
            </p>

        `;

    }


    else {

        result.innerHTML = `

            <h3>
                🩺 Medical Information
            </h3>

            <p>
                Your symptoms require professional
                medical evaluation.
            </p>

            <p>
                This tool provides general information
                and is not a medical diagnosis.
            </p>

        `;

    }

}


/* ==========================================
   APPOINTMENT
========================================== */

function bookAppointment(event) {

    event.preventDefault();


    const name =
        document.getElementById(
            "patientName"
        ).value.trim();


    const phone =
        document.getElementById(
            "patientPhone"
        ).value.trim();


    const doctor =
        document.getElementById(
            "doctorName"
        ).value;


    const date =
        document.getElementById(
            "appointmentDate"
        ).value;


    const time =
        document.getElementById(
            "appointmentTime"
        ).value;


    const result =
        document.getElementById(
            "appointmentResult"
        );


    result.innerHTML = `

        <div class="success-message">

            <h3>
                ✅ Appointment Submitted
            </h3>

            <p>
                Patient:
                ${escapeHTML(name)}
            </p>

            <p>
                Phone:
                ${escapeHTML(phone)}
            </p>

            <p>
                Doctor:
                ${escapeHTML(doctor)}
            </p>

            <p>
                Date:
                ${escapeHTML(date)}
            </p>

            <p>
                Time:
                ${escapeHTML(time)}
            </p>

            <p>
                This is a demo appointment
                for the student project.
            </p>

        </div>

    `;


    result.scrollIntoView({

        behavior: "smooth",

        block: "center"

    });

}


/* ==========================================
   EMERGENCY
========================================== */

function callEmergency() {

    const confirmCall =
        confirm(
            "Emergency assistance required?\n\n" +
            "Press OK to call 108."
        );


    if (confirmCall) {

        window.location.href =
            "tel:108";

    }

}


/* ==========================================
   ENTER KEY SEARCH
========================================== */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        const searchInput =
            document.getElementById(
                "searchInput"
            );


        if (searchInput) {

            searchInput.addEventListener(
                "keydown",
                function(event) {

                    if (
                        event.key === "Enter"
                    ) {

                        searchHospitals();

                    }

                }
            );

        }

    }
);


/* ==========================================
   ESCAPE HTML
========================================== */

function escapeHTML(value) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        value ?? "";


    return div.innerHTML;

}