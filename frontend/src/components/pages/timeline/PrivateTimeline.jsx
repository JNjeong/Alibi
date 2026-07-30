import RolePanel from "./RolePanel";
import TimelineBlock from "./TimelineBlock";
import "./timeline.css";

function PrivateTimeline() {
    return (
        <div className="private-timeline-page">
            <div className="private-timeline-container">
                <RolePanel />
                <TimelineBlock />
            </div>
        </div>
    );
}

export default PrivateTimeline;