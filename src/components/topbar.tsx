import { Form } from "react-bootstrap";

export default function Topbar({ setShowSharePoints, setShowLines }: {setShowSharePoints: Function, setShowLines: Function}) {
    return (
        <div id="topbar">
            <div id="logoAndTitle">
                <img src="/logo.svg" alt="Logo" height={80} id="logo" />
                <h1>China on Rails</h1>
            </div>
            <Form id="switch">
                <Form.Check
                    type="switch"
                    label="线路历史发展地图"
                    onChange={e => setShowLines(e.target.checked)}
                />
                <Form.Check
                    type="switch"
                    label="拍车机位分享"
                    onChange={e => setShowSharePoints(e.target.checked)}
                />
            </Form>
        </div>
    );
}