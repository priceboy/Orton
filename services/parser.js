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

    // =====================================
    // CLEAN TEXT
    // =====================================

    text = text
        .replace(/\r/g, "")
        .replace(/\t/g, " ")
        .replace(/[ ]{2,}/g, " ");

    // =====================================
    // NAME
    // =====================================

    let name =

        text.match(/PASSENGER\s*:?[\s\n]*([A-Z\/\s]+)/i)?.[1]

        ||

        text.match(/»\s*([A-Z\s\/]+?)Check-In/i)?.[1]

        ||

        null;

    if (name) {

        name = name
            .replace(/[^A-Z\/\s]/gi, "")
            .replace(/\s+/g, " ")
            .trim();
    }

    // =====================================
    // AIRLINE
    // =====================================

    const airline =

        text.match(
            /\b(RWANDAIR|ETHIOPIAN AIRLINES|AIR FRANCE|KENYA AIRWAYS|BRUSSELS AIRLINES)\b/i
        )?.[1]

        ||

        text.match(/\n([A-Z ]+LIMITED)/i)?.[1]

        ||

        null;

    // =====================================
    // ALL DATES
    // =====================================

    const allDates =

        [...text.matchAll(

            /\b\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4}\b/gi

        )]

        .map(m => m[0]);

    console.log("ALL DATES:", allDates);

    // =====================================
    // CABIN LUGGAGE
    // =====================================

    let cabin =

        text.match(
            /Cabin\s*Baggage[\s\S]{0,80}?(\d+\s?(?:KG|KGS|PC))/i
        )?.[1]

        ||

        text.match(
            /CABIN[\s\S]{0,50}?(\d+\s?(?:KG|KGS|PC))/i
        )?.[1]

        ||

        null;

    // =====================================
    // CHECKED LUGGAGE
    // =====================================

    let checked =

        text.match(
            /Checked\s*Baggage[\s\S]{0,80}?(\d+\s?(?:KG|KGS|PC))/i
        )?.[1]

        ||

        text.match(
            /BAGGAGE[\s\S]{0,50}?(\d+\s?(?:KG|KGS|PC))/i
        )?.[1]

        ||

        null;

    // =====================================
    // SPLIT SEGMENTS
    // =====================================

    const rawSegments =
        text.split(/DEPARTURE:/i).slice(1);

    const legs = [];

    rawSegments.forEach((seg, index) => {

        // =====================================
        // AIRPORTS
        // =====================================

        const airportMatches =

            [...seg.matchAll(/\b([A-Z]{3})\b/g)]

            .map(m => m[1])

            .filter(code => {

                return ![

                    "ADT",
                    "CNN",
                    "INF",
                    "BAG",
                    "CAB",
                    "VAT",
                    "TAX",

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

        const airports =
            [...new Set(airportMatches)];

        if (airports.length < 2)
            return;

        const from = airports[0];
        const to = airports[1];

        // =====================================
        // DATE
        // =====================================

        let departure_date =

            seg.match(
                /\b\d{1,2}\s+(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{4}\b/i
            )?.[0]

            ||

            null;

        // fallback to global dates
        if (!departure_date) {

            departure_date =
                allDates[index] || null;
        }

        // =====================================
        // TIME
        // =====================================

        let departure_time =

            seg.match(
                /Departing\s*At\s*:?\s*\n?\s*(\d{2}:\d{2})/i
            )?.[1]

            ||

            seg.match(/\b(\d{2}:\d{2})\b/)?.[1]

            ||

            null;

        // =====================================
        // FLIGHT NUMBER
        // =====================================

        let flight_number =

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

            departure_date,
            departure_time,

            flight_number
        });
    });

    // =====================================
    // DEBUG
    // =====================================

    console.log("LEGS:", legs);

    // =====================================
    // OUTBOUND
    // =====================================

    const outboundLeg =
        legs[0] || {};

    const departureAirport =
        outboundLeg.from || null;

    const arrivalAirport =
        outboundLeg.to || null;

    // =====================================
    // RETURN LEG DETECTION
    // =====================================

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

    // =====================================
    // FALLBACK ROUND TRIP
    // =====================================

    if (!returnLeg && legs.length >= 2) {

        const possibleReturn =
            legs[legs.length - 1];

        if (possibleReturn.from !== departureAirport) {

            returnLeg = possibleReturn;
        }
    }

    // =====================================
    // TRIP TYPE
    // =====================================

    const isRoundTrip =
        !!returnLeg;

    // =====================================
    // FINAL DEBUG
    // =====================================

    console.log("OUTBOUND:", outboundLeg);

    console.log("RETURN:", returnLeg);

    console.log("CABIN:", cabin);

    console.log("CHECKED:", checked);

    // =====================================
    // FINAL OUTPUT
    // =====================================

    return {

        customer_name: name,

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

        flight_number:
            outboundLeg.flight_number || null,

        // =====================================
        // AIRLINE / BAGGAGE
        // =====================================

        airline_name:
            airline,

        cabin_luggage:
            cabin,

        checked_luggage:
            checked,

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
