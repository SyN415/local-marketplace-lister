-- Function to increment proxy send count
CREATE OR REPLACE FUNCTION increment_proxy_send_count(proxy_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE email_proxy_pool
  SET 
    daily_send_count = daily_send_count + 1,
    last_used_at = now(),
    updated_at = now()
  WHERE id = proxy_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment proxy receive count
CREATE OR REPLACE FUNCTION increment_proxy_receive_count(proxy_id UUID, count INTEGER DEFAULT 1)
RETURNS void AS $$
BEGIN
  UPDATE email_proxy_pool
  SET 
    daily_receive_count = daily_receive_count + count,
    updated_at = now()
  WHERE id = proxy_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset daily counts (run via cron)
CREATE OR REPLACE FUNCTION reset_daily_proxy_counts()
RETURNS void AS $$
BEGIN
  UPDATE email_proxy_pool
  SET 
    daily_send_count = 0,
    daily_receive_count = 0,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;