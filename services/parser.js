```javascript
function getCheckInTime(time) {

    if (!time) return null;

    let [h, m] = time.split(":").map(Number);

    h -= 4;

    if (h < 0) h += 24;

    return `${h.toString().padStart(2, '0')}:${m
        .toString()
        .padStart(2, '0')}`;
}

function cleanValue(value) {

    if (!value) return null;

    return value
        .replace(/\s+/g, " ")
        .replace(/[|]/g, "")
        .trim();
}

function parseTicket(text) {

    // =====================================
    // CLEAN TEXT
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

        /(?:MR|MRS|MS)\s+([A-Z\/\s]{6,})/i,

        /PASSENGER\s*:?[\s\n]+([A-Z\/\s]{6,})/i,

        /NAME\s*:?[\s\n]+([A-Z\/\s]{6,})/i,

        /»\s*([A-Z\/\s]+?)Check-In/i
    ];

    for (const pattern of namePatterns) {

        const match = text.match(pattern);

        if (match?.[1]) {

            customerName = cleanValue(match[1]);

            customerName = customerName
                .replace(/[^A-Z\/\s]/gi, "")
                .trim();

            break;
        }
    }

    // =====================================
    // OUTBOUND DESTINATION FROM HEADER
    // =====================================

    let outboundDestination = null;

    const cityToAirport = {

        DOUALA: "DLA",
        KIGALI: "KGL",
        PARIS: "CDG",
        BANGUI: "BGF",
        BRUSSELS: "BRU",
        ISTANBUL: "IST"
    };

    const tripHeader =
    text.match(/TRIP TO\s+([A-Z\s]+)/i);

    if (tripHeader?.[1]) {

        const city =
        tripHeader[1]
            .trim()
            .split(" ")[0]
            .toUpperCase();

        outboundDestination =
        cityToAirport[city] || null;
    }

    // =====================================
    // ALL DATES
    // =====================================

    const allDates =

    [...text.matchAll(

        /\b\d{1,2}\s+(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4}\b/gi
    )]

    .map(m => cleanValue(m[0]));

    // =====================================
    // ALL TIMES
    // =====================================

    const allTimes =

    [...text.matchAll(

        /\b\d{2}:\d{2}\b/g
    )]

    .map(m => m[0]);

    // =====================================
    // ALL FLIGHT NUMBERS
    // =====================================

    const allFlightNumbers =

    [...text.matchAll(

        /\b([A-Z]{2}\s?\d{3,4})\b/g
    )]

    .map(m => cleanValue(m[1]));

    // =====================================
    // AIRPORT EXTRACTION
    // =====================================

    const airportCodes =

    [...text.matchAll(/\b[A-Z]{3}\b/g)]

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

    // =====================================
    // BUILD LEGS
    // =====================================

    const legs = [];

    for (let i = 0; i < airportCodes.length - 1; i += 2) {

        const from = airportCodes[i];
        const to = airportCodes[i + 1];

        if (!from || !to) continue;

        legs.push({

            from,
            to,

            departure_date:
            allDates[legs.length] || null,

            departure_time:
            allTimes[legs.length] || null,

            flight_number:
            allFlightNumbers[legs.length] || null
        });
    }

    // =====================================
    // OUTBOUND LEG
    // =====================================

    const outboundLeg =
    legs[0] || {};

    const departureAirport =
    outboundLeg.from || null;

    let arrivalAirport =
    outboundLeg.to || null;

    // HEADER DESTINATION OVERRIDE

    if (outboundDestination) {

        arrivalAirport =
        outboundDestination;
    }

    // =====================================
    // ROUND TRIP DETECTION
    // =====================================

    let isRoundTrip = false;

    for (const leg of legs.slice(1)) {

        if (leg.from === arrivalAirport) {

            isRoundTrip = true;
            break;
        }
    }

    // =====================================
    // RETURN FLIGHT
    // =====================================

    let returnDepartureAirport = null;
    let returnArrivalAirport = null;
    let returnDepartureDate = null;
    let returnDepartureTime = null;
    let returnFlightNumber = null;

    if (isRoundTrip) {

        // REVERSE OUTBOUND

        returnDepartureAirport =
        arrivalAirport;

        returnArrivalAirport =
        departureAirport;

        // FIND MATCHING LEG

        const returnLeg =
        legs.find(leg =>
            leg.from === returnDepartureAirport
        );

        if (returnLeg) {

            returnDepartureDate =
            returnLeg.departure_date;

            returnDepartureTime =
            returnLeg.departure_time;

            returnFlightNumber =
            returnLeg.flight_number;
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

    const cabinMatch =

    text.match(
        /Cabin\s+Baggage[\s\S]{0,60}?(\d+\s?(?:KG|PC))/i
    )

    ||

    text.match(
        /CABIN[\s\S]{0,40}?(\d+\s?(?:KG|PC))/i
    );

    if (cabinMatch?.[1]) {

        cabinLuggage =
        cleanValue(cabinMatch[1]);
    }

    // =====================================
    // CHECKED LUGGAGE
    // =====================================

    let checkedLuggage = null;

    const checkedMatch =

    text.match(
        /Checked\s+Baggage[\s\S]{0,60}?(\d+\s?(?:KG|PC))/i
    )

    ||

    text.match(
        /CHECKED[\s\S]{0,40}?(\d+\s?(?:KG|PC))/i
    );

    if (checkedMatch?.[1]) {

        checkedLuggage =
        cleanValue(checkedMatch[1]);
    }

    // =====================================
    // DEBUG
    // =====================================

    console.log("========== LEGS ==========");
    console.log(legs);

    console.log("========== OUTBOUND ==========");
    console.log(outboundLeg);

    console.log("========== RETURN ==========");
    console.log({
        returnDepartureAirport,
        returnArrivalAirport,
        returnDepartureDate,
        returnDepartureTime
    });

    console.log("========== BAGGAGE ==========");
    console.log({
        cabinLuggage,
        checkedLuggage
    });

    // =====================================
    // FINAL OUTPUT
    // =====================================

    return {

        customer_name:
        customerName,

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

        cabin_luggage:
        cabinLuggage,

        checked_luggage:
        checkedLuggage,

        trip_type:
        isRoundTrip
        ? "ROUND_TRIP"
        : "ONE_WAY",

        return_departure_airport:
        returnDepartureAirport,

        return_arrival_airport:
        returnArrivalAirport,

        return_departure_date:
        returnDepartureDate,

        return_departure_time:
        returnDepartureTime,

        return_checkin_time:
        getCheckInTime(
            returnDepartureTime
        ),

        return_flight_number:
        returnFlightNumber
    };
}

module.exports = parseTicket;
```
