import { memo } from 'react';
import { Tooltip } from 'react-tooltip';

interface ButtonProps {
    id: string
    Icon: React.ComponentType
    onClick: () => void
    isActive?: boolean
    shortcut: string | null 
    tooltipText: string | null
}

function Button({ id, Icon, isActive = false, onClick, shortcut = null, tooltipText = null}: ButtonProps) {

    return (
        <>
            <a className={id}>
                <button className={`${isActive ? "bg-slate-900" : "bg-slate-700"} hover:bg-slate-800 active:bg-slate-700 p-2 rounded-none`} onClick={onClick}>
                    <Icon />
                </button>
            </a>
            <Tooltip anchorSelect={"."+id}>
                <div className="flex flex-col">
                    <span> {tooltipText} </span>
                    <span className="text-xs"> Shortcut: {shortcut} </span>
                </div>
            </Tooltip>
        </>
    )
}

export default memo(Button);
