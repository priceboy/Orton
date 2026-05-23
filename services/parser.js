function getCheckInTime(time) {

    if (!time) return null;

    let [h, m] = time.split(":").map(Number);

    h -= 4;

    if (h < 0) h += 24;

    return `${h.toString().padStart(2, '0')}:${m}`;
}

function parseTicket(text) {

    // =========================
    // ✅ NAME EXTRACTION
    // =========================

    const nameMatch =
        text.match(/»\s*([A-Z\s\/]+?)Check-In/i);

    let name =
        nameMatch?.[1]?.trim() || null;

    if (name) {
        name = name.replace(/[^A-Z\s\/]/g, "");
    }

    // =========================
    // ✅ DEPARTURE DATE
    // =========================

    const depDate =
        text.match(
            /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b/i
        )?.[0]

        ||

        text.match(
            /\b\d{1,2}\s+[A-Z]{3,9}\s+\d{4}\b/
        )?.[0]

        ||

        null;

    // =========================
    // ✅ HEADER DESTINATION
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

    let headerArrival = null;

    if (headerDestination) {

        const city =
            headerDestination
            .split(",")[0]
            .trim();

        headerArrival =
            cityToAirport[city] || null;
    }

    // =========================
    // ✅ EXTRACT FLIGHT LEGS
    // =========================

    const segments =
        text.split("DEPARTURE:")
        .slice(1);

    const legs = [];

    for (let seg of segments) {

        const matches =
            seg.match(/\n([A-Z]{3})\n/g);

        if (!matches || matches.length < 2)
            continue;

        const airports =
            matches.map(a =>
                a.replace(/\n/g, "")
            );

        // =========================
        // ✅ DATE INSIDE SEGMENT
        // =========================

        const segmentDate =
            seg.match(
                /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}\b/i
            )?.[0]

            ||

            seg.match(
                /\b\d{1,2}\s+[A-Z]{3,9}\s+\d{4}\b/
            )?.[0]

            ||

            null;

        // =========================
        // ✅ TIME INSIDE SEGMENT
        // =========================

        const segmentTime =
            seg.match(
                /Departing At:\s*\n?(\d{2}:\d{2})/
            )?.[1] || null;

        // =========================
        // ✅ FLIGHT NUMBER
        // =========================

        const segmentFlight =
            seg.match(
                /\b([A-Z]{2}\s?\d{3,4})\b/
            )?.[1] || null;

        legs.push({

            from: airports[0],

            to: airports[1],

            departure_date: segmentDate,

            departure_time: segmentTime,

            flight_number: segmentFlight
        });
    }

    // =========================
    // ✅ DETERMINE ROUTE
    // =========================

    let departureAirport = null;
    let arrivalAirport = null;
    let isRoundTrip = false;

    if (legs.length > 0) {

        departureAirport =
            legs[0].from;

        const visited =
            [departureAirport];

        let current =
            departureAirport;

        for (let i = 0; i < legs.length; i++) {

            const leg = legs[i];

            if (leg.from === current) {

                if (visited.includes(leg.to)) {

                    isRoundTrip = true;

                    break;
                }

                visited.push(leg.to);

                current = leg.to;

            } else {

                isRoundTrip = true;

                break;
            }
        }

        arrivalAirport =
            visited[visited.length - 1];
    }

    // =========================
    // ✅ FINAL OVERRIDE
    // =========================

    if (headerArrival) {
        arrivalAirport = headerArrival;
    }

    // =========================
    // ✅ OUTBOUND SEGMENT
    // =========================

    const outboundLeg =
        legs[0] || {};

    // =========================
    // ✅ RETURN SEGMENT
    // =========================
    // Logic:
    // return trip starts when
    // FROM === final destination

    let returnLeg = null;

    if (arrivalAirport) {

        returnLeg =
            legs.find(leg =>
                leg.from === arrivalAirport
            );
    }

    // =========================
    // ✅ AIRLINE
    // =========================

    const airline =
        text.match(
            /\n([A-Z ]+LIMITED)/
        )?.[1]?.trim() || null;

    // =========================
    // ✅ BAGGAGE
    // =========================

    const cabin =
        text.match(
            /Cabin Baggage:\s*Adult,\s*([^\n]+)/
        )?.[1] || null;

    const checked =
        text.match(
            /Checked Baggage:\s*Adult,\s*([^\n]+)/
        )?.[1] || null;

    // =========================
    // ✅ FINAL OUTPUT
    // =========================

    return {

        customer_name: name,

        departure_airport: departureAirport,

        arrival_airport: arrivalAirport,

        departure_date:
            outboundLeg.departure_date || depDate,

        departure_time:
            outboundLeg.departure_time || null,

        checkin_time:
            getCheckInTime(
                outboundLeg.departure_time
            ),

        airline_name: airline,

        flight_number:
            outboundLeg.flight_number || null,

        cabin_luggage: cabin,

        checked_luggage: checked,

        trip_type:
            isRoundTrip
            ? "ROUND_TRIP"
            : "ONE_WAY",

        // =========================
        // ✅ RETURN TRIP DATA
        // =========================

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
