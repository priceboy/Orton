function getCheckInTime(time) {

    if (!time) return null;

    let [h, m] = time.split(":").map(Number);

    h -= 4;

    if (h < 0) h += 24;

    return `${h.toString().padStart(2, '0')}:${m
        .toString()
        .padStart(2, '0')}`;
}

function parseTicket(text) {

    // =========================
    // CLEAN TEXT
    // =========================

    text = text
        .replace(/\r/g, "")
        .replace(/\t/g, " ");

    // =========================
    // NAME
    // =========================

    const nameMatch =
    text.match(/»\s*([A-Z\s\/]+?)Check-In/i);

    let name =
    nameMatch?.[1]?.trim() || null;

    if (name) {

        name =
        name.replace(/[^A-Z\s\/]/g, "");
    }

    // =========================
    // HEADER DESTINATION
    // =========================

    const headerMatch =
    text.match(/TRIP TO\s+([A-Z\s]+)/i);

    let headerDestination =
    headerMatch?.[1]?.trim();

    const cityToAirport = {

        "DOUALA": "DLA",

        "KIGALI": "KGL",

        "PARIS": "CDG",

        "BANGUI": "BGF"
    };

    let finalDestination = null;

    if (headerDestination) {

        const city =
        headerDestination
        .split(",")[0]
        .trim();

        finalDestination =
        cityToAirport[city] || null;
    }

    // =========================
    // GLOBAL DATES
    // =========================

    const globalDates =

    [...text.matchAll(

        /\b\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4}\b/gi
    )]

    .map(m => m[0]);

    // =========================
    // SPLIT SEGMENTS
    // =========================

    const segments =
    text.split("DEPARTURE:")
    .slice(1);

    const legs = [];

    // =========================
    // EXTRACT LEGS
    // =========================

    segments.forEach((seg, index) => {

        // =========================
        // AIRPORTS
        // =========================

        const airportMatches =

        [...seg.matchAll(

            /(?:^|\n)\s*([A-Z]{3})\s*(?:\n|$)/g
        )]

        .map(m => m[1])

        .filter(code => {

            return ![

                "ADT",
                "CNN",
                "BAG",
                "CAB",
                "VAT",

                "JAN",
                "FEB",
                "MAR",
                "APR",
                "MAY",
                "JUN",
                "JUL",
                "AUG",
                "SEP",
                "OCT",
                "NOV",
                "DEC"

            ].includes(code);
        });

        if (airportMatches.length < 2)
            return;

        const from =
        airportMatches[0];

        const to =
        airportMatches[1];

        // =========================
        // DATE
        // =========================

        const depDate =
        globalDates[index] || null;

        // =========================
        // TIME
        // =========================

        const depTime =

        seg.match(
            /Departing At:\s*\n?\s*(\d{2}:\d{2})/i
        )?.[1]

        ||

        seg.match(
            /\b(\d{2}:\d{2})\b/
        )?.[1]

        ||

        null;

        // =========================
        // FLIGHT NUMBER
        // =========================

        const flightNo =

        seg.match(
            /\b([A-Z]{2}\s?\d{3,4})\b/
        )?.[1]

        ||

        null;

        // =========================
        // SAVE LEG
        // =========================

        legs.push({

            from,

            to,

            depDate,

            depTime,

            flightNo
        });
    });

    // =========================
    // DEBUG
    // =========================

    console.log("LEGS:", legs);

    // =========================
    // OUTBOUND FLIGHT
    // =========================

    const firstLeg =
    legs[0] || {};

    let departureAirport =
    firstLeg.from || null;

    let arrivalAirport =
    firstLeg.to || null;

    // =========================
    // OVERRIDE FINAL DESTINATION
    // =========================

    if (finalDestination) {

        arrivalAirport =
        finalDestination;
    }

    // =========================
    // RETURN LEG
    // =========================

    let returnLeg = null;

    for (let i = 1; i < legs.length; i++) {

        const leg = legs[i];

        if (

            leg.from === arrivalAirport &&

            leg.to === departureAirport
        ) {

            returnLeg = leg;
            break;
        }
    }

    // =========================
    // TRIP TYPE
    // =========================

    const isRoundTrip =
    !!returnLeg;

    // =========================
    // AIRLINE
    // =========================

    const airline =

    text.match(
        /\n([A-Z ]+LIMITED)/i
    )?.[1]?.trim()

    ||

    text.match(
        /\b(ETHIOPIAN AIRLINES|RWANDAIR|AIR FRANCE|KENYA AIRWAYS)\b/i
    )?.[1]

    ||

    null;

    // =========================
    // BAGGAGE
    // =========================

    const cabin =

    text.match(
        /Cabin Baggage:\s*Adult,\s*([^\n]+)/i
    )?.[1]

    ||

    text.match(
        /Cabin Baggage\s*([^\n]+)/i
    )?.[1]

    ||

    null;

    const checked =

    text.match(
        /Checked Baggage:\s*Adult,\s*([^\n]+)/i
    )?.[1]

    ||

    text.match(
        /Checked Baggage\s*([^\n]+)/i
    )?.[1]

    ||

    null;

    // =========================
    // FINAL DEBUG
    // =========================

    console.log("OUTBOUND:", firstLeg);

    console.log("RETURN:", returnLeg);

    // =========================
    // FINAL OUTPUT
    // =========================

    return {

        customer_name: name,

        // =========================
        // OUTBOUND
        // =========================

        departure_airport:
        departureAirport,

        arrival_airport:
        arrivalAirport,

        departure_date:
        firstLeg.depDate || null,

        departure_time:
        firstLeg.depTime || null,

        checkin_time:
        getCheckInTime(
            firstLeg.depTime
        ),

        flight_number:
        firstLeg.flightNo || null,

        // =========================
        // AIRLINE / BAGGAGE
        // =========================

        airline_name:
        airline,

        cabin_luggage:
        cabin,

        checked_luggage:
        checked,

        // =========================
        // TRIP TYPE
        // =========================

        trip_type:
        isRoundTrip
        ? "ROUND_TRIP"
        : "ONE_WAY",

        // =========================
        // RETURN FLIGHT
        // =========================

        return_departure_airport:
        returnLeg?.from || null,

        return_arrival_airport:
        returnLeg?.to || null,

        return_departure_date:
        returnLeg?.depDate || null,

        return_departure_time:
        returnLeg?.depTime || null,

        return_checkin_time:
        getCheckInTime(
            returnLeg?.depTime
        ),

        return_flight_number:
        returnLeg?.flightNo || null
    };
}

module.exports = parseTicket;
