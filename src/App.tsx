import Menu from './Menu';
import Canvas from './Canvas';
import {useState, useRef} from 'react';



export default function App() {
    const [mn, setMn] = useState(true);
    const canvas = useRef(null);
    return (
        <>
            <Menu image={mn}/>
            <Canvas canvasIn={canvas}/>

        </>
    );
}
