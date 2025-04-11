<?php
session_start();

// Configure error reporting
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Firebase project settings
$firebase_project_id = 'your-project-id'; // Replace with your Firebase project ID

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Get the request body
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);

    if (!isset($data['idToken'])) {
        exit(json_encode(['error' => 'No token provided']));
    }

    $idToken = $data['idToken'];
    $remember = $data['remember'] ?? false;

    try {
        // Verify the ID token with Firebase
        $response = verifyFirebaseToken($idToken);

        if ($response['success']) {
            // Token is valid, set up the session
            session_regenerate_id(true);
            
            $_SESSION['user_id'] = $response['user']['user_id'];
            $_SESSION['email'] = $response['user']['email'];
            $_SESSION['last_activity'] = time();

            // Set remember me cookie if requested
            if ($remember) {
                $expires = time() + (30 * 24 * 60 * 60); // 30 days
                setcookie('firebase_token', $idToken, $expires, '/', '', true, true);
            }

            exit(json_encode([
                'success' => true, 
                'redirect' => 'dashboard.php'
            ]));
        } else {
            exit(json_encode(['error' => 'Invalid token']));
        }
    } catch (Exception $e) {
        error_log("Login error: " . $e->getMessage());
        http_response_code(500);
        exit(json_encode(['error' => 'An error occurred during login']));
    }
}

/**
 * Verify Firebase ID token
 * @param string $idToken The Firebase ID token to verify
 * @return array Response containing success status and user data
 */
function verifyFirebaseToken($idToken) {
    global $firebase_project_id;
    
    // Google's public keys URL
    $keyUrl = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
    
    try {
        // Fetch Google's public keys
        $publicKeys = json_decode(file_get_contents($keyUrl), true);
        
        // Decode the token header
        $tokenParts = explode('.', $idToken);
        $header = json_decode(base64_decode($tokenParts[0]), true);
        
        if (!isset($header['kid']) || !isset($publicKeys[$header['kid']])) {
            return ['success' => false, 'error' => 'Invalid token header'];
        }
        
        // Verify token
        $publicKey = openssl_get_publickey($publicKeys[$header['kid']]);
        $signature = base64_decode(strtr($tokenParts[2], '-_', '+/'));
        
        $success = openssl_verify(
            $tokenParts[0] . '.' . $tokenParts[1],
            $signature,
            $publicKey,
            'RSA-SHA256'
        );
        
        if ($success !== 1) {
            return ['success' => false, 'error' => 'Invalid token signature'];
        }
        
        // Decode payload
        $payload = json_decode(base64_decode($tokenParts[1]), true);
        
        // Verify token is not expired
        if (time() > $payload['exp']) {
            return ['success' => false, 'error' => 'Token expired'];
        }
        
        // Verify audience
        if ($payload['aud'] !== $firebase_project_id) {
            return ['success' => false, 'error' => 'Invalid audience'];
        }
        
        // Verify issuer
        if ($payload['iss'] !== "https://securetoken.google.com/{$firebase_project_id}") {
            return ['success' => false, 'error' => 'Invalid issuer'];
        }
        
        return [
            'success' => true,
            'user' => [
                'user_id' => $payload['sub'],
                'email' => $payload['email'],
                'email_verified' => $payload['email_verified']
            ]
        ];
        
    } catch (Exception $e) {
        error_log("Token verification error: " . $e->getMessage());
        return ['success' => false, 'error' => 'Token verification failed'];
    }
}
