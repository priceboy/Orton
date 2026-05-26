function getCheckInTime(time) {

    // =====================================
    // SAFETY
    // =====================================

    if (
        !time ||
        typeof time !== "string" ||
        !time.includes(":")
    ) {
        return null;
    }

    const parts = time.split(":");

    if (parts.length !== 2)
        return null;

    let h = parseInt(parts[0]);
    let m = parseInt(parts[1]);

    if (
        isNaN(h) ||
        isNaN(m)
    ) {
        return null;
    }

    // =====================================
    // CHECK-IN = 4 HOURS BEFORE
    // =====================================

    h -= 4;

    if (h < 0)
        h += 24;

    return `${h
        .toString()
        .padStart(2, "0")}:${m
        .toString()
        .padStart(2, "0")}`;
}

// =====================================
// CLEAN VALUE
// =====================================

function cleanValue(value) {

    if (!value)
        return null;

    return value
        .replace(/\s+/g, " ")
        .replace(/[|]/g, "")
        .trim();
}

// =====================================
// MAIN PARSER
// =====================================

function parseTicket(text) {

    // =====================================
    // CLEAN PDF TEXT
    // =====================================

    text = text
        .replace(/\r/g, "\n")
        .replace(/\t/g, " ")
        .replace(/[ ]{2,}/g, " ");

    // =====================================
    // CUSTOMER NAME
    // =====================================

    let customerName = null;

    const namePatterns = [

        /(?:MR|MRS|MS)\s+([A-Z\/\s]{5,})/i,

        /PASSENGER\s*:?[\s\n]+([A-Z\/\s]{5,})/i,

        /NAME\s*:?[\s\n]+([A-Z\/\s]{5,})/i,

        /»\s*([A-Z\/\s]+?)Check-In/i
    ];

    for (const pattern of namePatterns) {

        const match = text.match(pattern);

        if (match?.[1]) {

            customerName =
            cleanValue(match[1]);

            customerName =
            customerName
                .replace(/[^A-Z\/\s]/gi, "")
                .trim();

            break;
        }
    }

    // =====================================
    // HEADER DESTINATION
    // =====================================

    let outboundDestination = null;

    const cityToAirport = {

        DOUALA: "DLA",
        KIGALI: "KGL",
        PARIS: "CDG",
        BANGUI: "BGF",
        BRUSSELS: "BRU",
        ISTANBUL: "IST",
        NAIROBI: "NBO"
    };

    const headerMatch =
    text.match(/TRIP TO\s+([A-Z\s]+)/i);

    if (headerMatch?.[1]) {

        const city =
        headerMatch[1]
            .trim()
            .split(" ")[0]
            .toUpperCase();

        outboundDestination =
        cityToAirport[city] || null;
    }

    // =====================================
    // SPLIT SEGMENTS
    // =====================================

    const splitSegments =
    text.split("DEPARTURE:");

    const segments =
    splitSegments.slice(1);

    const legs = [];

    // =====================================
    // BUILD LEGS
    // =====================================

    segments.forEach((seg, index) => {

        // =====================================
        // AIRPORTS
        // =====================================

        const airportCodes =

        [...seg.matchAll(/\b[A-Z]{3}\b/g)]

        .map(m => m[0])

        .filter(code => {

            return ![

                "ADT",
                "CNN",
                "INF",
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

        if (airportCodes.length < 2)
            return;

        // =====================================
        // FIRST TWO AIRPORTS
        // =====================================

        const from =
        airportCodes[0];

        const to =
        airportCodes[1];

        if (!from || !to)
            return;

        if (from === to)
            return;

        // =====================================
        // DATE ABOVE SEGMENT
        // =====================================

        const beforeSegment =
        splitSegments[index];

        const dateMatches =

        [...beforeSegment.matchAll(

            /\b\d{1,2}\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4}\b/gi
        )];

        const departureDate =
        dateMatches.length
        ? cleanValue(
            dateMatches[
                dateMatches.length - 1
            ][0]
        )
        : null;

        // =====================================
        // TIME
        // =====================================

        const departureTime =

        seg.match(
            /\b\d{2}:\d{2}\b/
        )?.[0]

        ||

        null;

        // =====================================
        // FLIGHT NUMBER
        // =====================================

        const flightNumber =

        seg.match(
            /\b([A-Z]{2}\s?\d{3,4})\b/
        )?.[1]

        ||

        null;

        // =====================================
        // SAVE LEG
        // =====================================

        legs.push({

            from,
            to,

            departure_date:
            departureDate,

            departure_time:
            departureTime,

            flight_number:
            cleanValue(flightNumber)
        });
    });

    // =====================================
    // DEBUG LEGS
    // =====================================

    console.log("========== LEGS ==========");
    console.log(legs);

    // =====================================
    // OUTBOUND LEG
    // =====================================

    const outboundLeg =
    legs[0] || {};

    const departureAirport =
    outboundLeg.from || null;

    let arrivalAirport =
    outboundLeg.to || null;

    // =====================================
    // HEADER DESTINATION OVERRIDE
    // =====================================

    if (outboundDestination) {

        arrivalAirport =
        outboundDestination;
    }

    // =====================================
    // ROUND TRIP DETECTION
    // =====================================

    let isRoundTrip = false;

    let returnLeg = null;

    // =====================================
    // IF LEGS CONTINUE AFTER
    // DESTINATION ARRIVAL
    // =====================================

    if (legs.length > 1) {

        for (let i = 1; i < legs.length; i++) {

            const leg = legs[i];

            // =====================================
            // RETURN STARTS FROM
            // OUTBOUND DESTINATION
            // =====================================

            if (
                leg.from === arrivalAirport
            ) {

                isRoundTrip = true;

                returnLeg = {

                    from:
                    arrivalAirport,

                    to:
                    departureAirport,

                    departure_date:
                    leg.departure_date,

                    departure_time:
                    leg.departure_time,

                    flight_number:
                    leg.flight_number
                };

                break;
            }
        }
    }

    // =====================================
    // AIRLINE
    // =====================================

    const airline =

    text.match(
        /\b(RWANDAIR|AIR FRANCE|KENYA AIRWAYS|ETHIOPIAN AIRLINES)\b/i
    )?.[1]

    ||

    text.match(
        /\n([A-Z ]+LIMITED)/i
    )?.[1]

    ||

    null;

    // =====================================
    // CABIN LUGGAGE
    // =====================================

    let cabinLuggage = null;

    const cabinPatterns = [

        /Cabin\s*Baggage[\s\S]{0,100}?(\d+\s?(?:KG|PC))/i,

        /CABIN[\s\S]{0,100}?(\d+\s?(?:KG|PC))/i,

        /Hand\s*Baggage[\s\S]{0,100}?(\d+\s?(?:KG|PC))/i
    ];

    for (const pattern of cabinPatterns) {

        const match =
        text.match(pattern);

        if (match?.[1]) {

            cabinLuggage =
            cleanValue(match[1]);

            break;
        }
    }

    // =====================================
    // CHECKED LUGGAGE
    // =====================================

    let checkedLuggage = null;

    const checkedPatterns = [

        /Checked\s*Baggage[\s\S]{0,100}?(\d+\s?(?:KG|PC))/i,

        /CHECKED[\s\S]{0,100}?(\d+\s?(?:KG|PC))/i,

        /Baggage\s*Allowance[\s\S]{0,100}?(\d+\s?(?:KG|PC))/i
    ];

    for (const pattern of checkedPatterns) {

        const match =
        text.match(pattern);

        if (match?.[1]) {

            checkedLuggage =
            cleanValue(match[1]);

            break;
        }
    }

    // =====================================
    // FINAL DEBUG
    // =====================================

    console.log("========== FINAL ==========");

    console.log({

        customerName,

        departureAirport,
        arrivalAirport,

        outboundDate:
        outboundLeg.departure_date,

        returnDate:
        returnLeg?.departure_date,

        cabinLuggage,
        checkedLuggage,

        tripType:
        isRoundTrip
        ? "ROUND_TRIP"
        : "ONE_WAY"
    });

    // =====================================
    // FINAL OUTPUT
    // =====================================

    return {

        customer_name:
        customerName,

        // =====================================
        // OUTBOUND
        // =====================================

        departure_airport:
        departureAirport,

        arrival_airport:
        arrivalAirport,

        departure_date:
        outboundLeg.departure_date || null,

        departure_time:
        outboundLeg.departure_time || null,

        checkin_time:
        getCheckInTime(
            outboundLeg.departure_time
        ),

        airline_name:
        cleanValue(airline),

        flight_number:
        outboundLeg.flight_number || null,

        // =====================================
        // BAGGAGE
        // =====================================

        cabin_luggage:
        cabinLuggage,

        checked_luggage:
        checkedLuggage,

        // =====================================
        // TRIP TYPE
        // =====================================

        trip_type:
        isRoundTrip
        ? "ROUND_TRIP"
        : "ONE_WAY",

        // =====================================
        // RETURN
        // =====================================

        return_departure_airport:
        returnLeg?.from || null,

        return_arrival_airport:
        returnLeg?.to || null,

        return_departure_date:
        returnLeg?.departure_date || null,

        return_departure_time:
        returnLeg?.departure_time || null,

        return_checkin_time:
        getCheckInTime(
            returnLeg?.departure_time
        ),

        return_flight_number:
        returnLeg?.flight_number || null
    };
}

module.exports = parseTicket;
