interface ButtonProps {
    Icon: React.ComponentType
    onClick: () => void
    isActive?: boolean
}

export default function Button({ Icon, isActive = false, onClick}: ButtonProps) {

    return (
        <div className={`${isActive ? "bg-slate-900" : "bg-slate-700"} hover:bg-slate-800 active:bg-slate-700 py-1 px-1 rounded-none`} onClick={onClick}>
            <Icon />
        </div>
    )
}


