use std::process::Command;
use std::os::windows::process::CommandExt;
use std::path::{Path, PathBuf};

const CREATE_NO_WINDOW: u32 = 0x08000000;

fn project_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .and_then(|p| p.parent())
        .and_then(|p| p.parent())
        .unwrap()
        .to_owned()
}

#[tauri::command]
pub async fn orkestra_projects() -> Result<Vec<String>, String> {
    let base = project_root();
    let mut projects = Vec::new();
    if let Ok(entries) = std::fs::read_dir(base) {
        for entry in entries.flatten() {
            if let Ok(file_type) = entry.file_type() {
                if file_type.is_dir() {
                    if let Ok(name) = entry.file_name().into_string() {
                        if !name.starts_with('.') && !name.starts_with('_') {
                            projects.push(name);
                        }
                    }
                }
            }
        }
    }
    projects.sort();
    Ok(projects)
}

pub fn build_command(root: &Path, agent: &str, project: &str, task: &str) -> Command {
    let project_cwd = root.join(project);
    let afunobet_py = root.join("AfuNobet").join("afunobet.py");
    
    let mut cmd = Command::new("python");
    cmd.arg(afunobet_py);
    
    if agent == "otomatik" {
        cmd.arg("devret");
        cmd.arg("--cwd").arg(&project_cwd);
        cmd.arg("--is").arg(task);
    } else {
        cmd.arg("calistir");
        cmd.arg("--ajan").arg(agent);
        cmd.arg("--cwd").arg(&project_cwd);
        cmd.arg("--is").arg(task);
    }
    cmd.creation_flags(CREATE_NO_WINDOW);
    cmd
}

#[tauri::command]
pub async fn orkestra_send(agent: String, project: String, task: String) -> Result<(), String> {
    let root = project_root();
    let mut cmd = build_command(&root, &agent, &project, &task);
    
    match cmd.spawn() {
        Ok(_) => Ok(()),
        Err(e) => Err(format!("Görev başlatılamadı: {}", e)),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_command_otomatik() {
        let root = Path::new("C:\\afu");
        let cmd = build_command(root, "otomatik", "proj1", "test_task");
        let args: Vec<_> = cmd.get_args().map(|s| s.to_str().unwrap()).collect();
        assert_eq!(args, vec!["C:\\afu\\AfuNobet\\afunobet.py", "devret", "--cwd", "C:\\afu\\proj1", "--is", "test_task"]);
    }

    #[test]
    fn test_build_command_agent() {
        let root = Path::new("C:\\afu");
        let cmd = build_command(root, "codex", "proj2", "test_task");
        let args: Vec<_> = cmd.get_args().map(|s| s.to_str().unwrap()).collect();
        assert_eq!(args, vec!["C:\\afu\\AfuNobet\\afunobet.py", "calistir", "--ajan", "codex", "--cwd", "C:\\afu\\proj2", "--is", "test_task"]);
    }
}
