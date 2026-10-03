#[path = "../src/ilk_kullanim.rs"]
mod ilk_kullanim;

#[test]
fn first_launch_flag_survives_restart_and_is_scoped_to_app_data() {
    let dir = std::env::temp_dir().join(format!("afu-first-use-{}", std::process::id()));
    let data = dir.join("app-data");
    assert!(ilk_kullanim::claim(&data).unwrap());
    assert!(!ilk_kullanim::claim(&data).unwrap());
    assert!(data.join("ilk-kullanim-v1.seen").is_file());
    std::fs::remove_dir_all(dir).unwrap();
}

#[test]
fn concurrent_startups_only_claim_one_hint() {
    let dir = std::env::temp_dir().join(format!("afu-first-use-race-{}", std::process::id()));
    let workers: Vec<_> = (0..8).map(|_| {
        let path = dir.clone();
        std::thread::spawn(move || ilk_kullanim::claim(&path).unwrap())
    }).collect();
    assert_eq!(workers.into_iter().filter(|w| w.thread().id() != std::thread::current().id()).map(|w| w.join().unwrap() as usize).sum::<usize>(), 1);
    std::fs::remove_dir_all(dir).unwrap();
}
