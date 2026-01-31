use keyring::Entry;

const SERVICE: &str = "creatorai-v2";

fn entry(endpoint_id: &str) -> Entry {
    Entry::new(SERVICE, endpoint_id).expect("keyring entry")
}

pub fn has_api_key(endpoint_id: &str) -> Result<bool, String> {
    match entry(endpoint_id).get_password() {
        Ok(v) => Ok(!v.is_empty()),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(e) => Err(format!("读取 API Key 失败: {e}")),
    }
}

pub fn set_api_key(endpoint_id: &str, api_key: &str) -> Result<(), String> {
    entry(endpoint_id)
        .set_password(api_key)
        .map_err(|e| format!("保存 API Key 失败: {e}"))
}

pub fn delete_api_key(endpoint_id: &str) -> Result<(), String> {
    match entry(endpoint_id).delete_password() {
        Ok(_) => Ok(()),
        Err(keyring::Error::NoEntry) => Ok(()),
        Err(e) => Err(format!("删除 API Key 失败: {e}")),
    }
}

pub fn get_api_key(endpoint_id: &str) -> Result<String, String> {
    entry(endpoint_id)
        .get_password()
        .map_err(|e| format!("读取 API Key 失败: {e}"))
}

