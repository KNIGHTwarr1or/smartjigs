-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create operation_history table
CREATE TABLE public.operation_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL,
  operation_name TEXT NOT NULL,
  servo_angle INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,
  sms_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on operation_history
ALTER TABLE public.operation_history ENABLE ROW LEVEL SECURITY;

-- Operation history policies
CREATE POLICY "Users can view their own operation history" 
ON public.operation_history FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own operations" 
ON public.operation_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own operations" 
ON public.operation_history FOR UPDATE 
USING (auth.uid() = user_id);

-- Create devices table for ESP32 registration
CREATE TABLE public.devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL UNIQUE,
  device_name TEXT,
  ip_address TEXT,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  is_online BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on devices
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Devices policies
CREATE POLICY "Users can view their own devices" 
ON public.devices FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own devices" 
ON public.devices FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own devices" 
ON public.devices FOR UPDATE 
USING (auth.uid() = user_id);

-- Trigger function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Apply trigger to profiles
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (new.id, new.raw_user_meta_data ->> 'display_name');
  RETURN new;
END;
$$;

-- Trigger for auto profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Enable realtime for operation_history
ALTER PUBLICATION supabase_realtime ADD TABLE public.operation_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.devices;