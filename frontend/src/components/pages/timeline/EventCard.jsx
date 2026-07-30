function EventCard({ event }) {
    return (
        <div className="event-card">
            <div className="event-card-header">
                <div>
                    <h4>{event.time}</h4>
                    {/* <span>{event.place}</span> */}
                </div>

                <span className={`event-badge ${event.color}`}>
                    {event.place}
                </span>
            </div>

            <p>{event.text}</p>
        </div>
    );
}

export default EventCard;