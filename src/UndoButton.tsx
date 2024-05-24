import Button from './Button'
import { SlActionUndo } from "react-icons/sl";

interface UndoButtonProps {
    setUndo: (undo: boolean) => void;
}
export default function UndoButton({ setUndo }: UndoButtonProps) {
    function onClickUndo() {
        setUndo(true);
    }
    return (
        <div className="absolute flex bottom-1 right-1">
            <Button Icon={SlActionUndo} onClick={onClickUndo}/>
        </div>
    )
}
