import Form from "react-bootstrap/Form";
import InputGroup from "react-bootstrap/InputGroup";
import { lines } from "../lines";

export default function Timeline({ year, setYear }: { year: number; setYear: Function }) {
  const availableYears = Object.keys(lines).map(Number);

  const handleChange = (value: number) => {
    // 找到最近的可用年份
    const nearestYear = availableYears.reduce((prev, curr) =>
      Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
    );
    setYear(nearestYear);
  };

  return (
    <div id="timeline">
      <InputGroup id="yearNum">
        <InputGroup.Text>年份</InputGroup.Text>
        <Form.Control
          type="number"
          min={Math.min(...availableYears)}
          max={Math.max(...availableYears)}
          value={year}
          onChange={e => handleChange(Number(e.target.value))}
        />
      </InputGroup>

      <Form.Range
        min={Math.min(...availableYears)}
        max={Math.max(...availableYears)}
        step={1}
        value={year}
        onChange={e => handleChange(Number(e.target.value))}
      />
    </div>
  );
}
