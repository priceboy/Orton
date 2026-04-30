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
    const nameMatch = text.match(/»\s*([A-Z\s\/]+?)Check-In/i);
    let name = nameMatch?.[1]?.trim() || null;
    if (name) name = name.replace(/[^A-Z\s\/]/g, "");

    // =========================
    // ✅ HEADER DESTINATION (🔥 KEY FIX)
    // =========================
    // Example: TRIP TO DOUALA, CAMEROON
    const headerMatch = text.match(/TRIP TO\s+([A-Z\s]+)/i);
    let headerDestination = headerMatch?.[1]?.trim();

    // Map city → airport code manually (you can expand this later)
    const cityToAirport = {
        "DOUALA": "DLA",
        "KIGALI": "KGL",
        "PARIS": "CDG",
        "BANGUI": "BGF"
    };

    let headerArrival = null;

    if (headerDestination) {
        const city = headerDestination.split(",")[0].trim();
        headerArrival = cityToAirport[city] || null;
    }

    // =========================
    // ✅ EXTRACT ALL FLIGHT LEGS
    // =========================
    const segments = text.split("DEPARTURE:").slice(1);
    const legs = [];

    for (let seg of segments) {
        const matches = seg.match(/\n([A-Z]{3})\n/g);
        if (!matches || matches.length < 2) continue;

        const airports = matches.map(a => a.replace(/\n/g, ""));

        legs.push({
            from: airports[0],
            to: airports[1]
        });
    }

    // =========================
    // ✅ DETERMINE ROUTE
    // =========================
    let departureAirport = null;
    let arrivalAirport = null;
    let isRoundTrip = false;

    if (legs.length > 0) {

        departureAirport = legs[0].from;

        const visited = [departureAirport];
        let current = departureAirport;

        for (let i = 0; i < legs.length; i++) {
            const leg = legs[i];

            if (leg.from === current) {

                // If we revisit → return trip starts
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

        // Default arrival (fallback)
        arrivalAirport = visited[visited.length - 1];
    }

    // =========================
    // 🔥 FINAL OVERRIDE USING HEADER
    // =========================
    if (headerArrival) {
        arrivalAirport = headerArrival;
    }

    // =========================
    // ✅ FIRST SEGMENT DETAILS
    // =========================
    const firstSegment = segments[0] || "";

    const depTime =
        firstSegment.match(/Departing At:\s*\n?(\d{2}:\d{2})/)?.[1] || null;

    const airline =
        firstSegment.match(/\n([A-Z ]+LIMITED)/)?.[1]?.trim() || null;

    const flightNo =
        firstSegment.match(/\b([A-Z]{2}\s?\d{3,4})\b/)?.[1] || null;

    // =========================
    // ✅ BAGGAGE
    // =========================
    const cabin =
        text.match(/Cabin Baggage:\s*Adult,\s*([^\n]+)/)?.[1] || null;

    const checked =
        text.match(/Checked Baggage:\s*Adult,\s*([^\n]+)/)?.[1] || null;

    // =========================
    // ✅ FINAL OUTPUT
    // =========================
    return {
        customer_name: name,
        departure_airport: departureAirport,
        arrival_airport: arrivalAirport,
        departure_time: depTime,
        checkin_time: getCheckInTime(depTime),
        airline_name: airline,
        flight_number: flightNo,
        cabin_luggage: cabin,
        checked_luggage: checked,
        trip_type: isRoundTrip ? "ROUND_TRIP" : "ONE_WAY"
    };
}

module.exports = parseTicket;