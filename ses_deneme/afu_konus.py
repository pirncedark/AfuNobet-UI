from pathlib import Path

def resolve_local(root: Path, configured: str = None) -> Path | None:
    if configured:
        conf_path = Path(configured)
        if conf_path.exists():
            return conf_path
    
    portable = root.parent / 'ses'
    if portable.exists():
        return portable
        
    legacy = root.parent.parent / '_deneme' / 'ses'
    if legacy.exists():
        return legacy
        
    return None