// Diagnostic sink required by the preserved island. No files are written.
pub fn line(message: impl AsRef<str>) {
    eprintln!("[AfuNobet-UI] {}", message.as_ref());
}
