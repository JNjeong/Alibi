function DeductionSelect({
    number,
    title,
    value,
    options,
    onChange,
    disabled
}) {
    return (
        <div className="deduction-select">
            <div className="select-header">
                <span className="select-number">
                    {number}
                </span>
                <span className="select-title">
                    {title}
                </span>
            </div>

            <select
                value={value}
                disabled={disabled}
                onChange={(e) => onChange(e.target.value)}
                className="deduction-dropdown"
            >
                <option value="">
                    선택 안 함
                </option>
                {options.map((option) => (
                    <option
                        key={option}
                        value={option}
                    >
                        {option}
                    </option>
                ))}
            </select>
        </div>
    )
}

export default DeductionSelect;