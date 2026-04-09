package com.governance.evaluation.controller;

import com.governance.evaluation.entity.*;
import com.governance.evaluation.repository.UserRepository;
import com.governance.evaluation.service.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final UserDetailsService userDetailsService;
    private final JwtService jwtService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> loginRequest) {
        try {
            String email = loginRequest.get("email");
            String password = loginRequest.get("password");

            System.out.println("🔐 Login attempt for: " + email);

            // Load user from DB
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Check if active
            if (!user.getIsActive()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Account is inactive"));
            }

            // Manually verify password using BCrypt
            if (!passwordEncoder.matches(password, user.getPassword())) {
                System.out.println("❌ Password mismatch for: " + email);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("error", "Invalid email or password"));
            }

            // Generate token
            UserDetails userDetails = userDetailsService.loadUserByUsername(email);
            String token = jwtService.generateToken(userDetails);

            Map<String, Object> response = new HashMap<>();
            response.put("token", token);

            Map<String, Object> userInfo = new HashMap<>();
            userInfo.put("userId", user.getUserId());
            userInfo.put("email", user.getEmail());
            userInfo.put("name", user.getName());
            userInfo.put("role", user.getRole().toString());
            response.put("user", userInfo);

            System.out.println("✅ Login successful: " + email + " role: " + user.getRole());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("❌ Login failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Invalid email or password"));
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, Object> registerRequest) {
        try {
            String email   = (String) registerRequest.get("email");
            String password = (String) registerRequest.get("password");
            String name    = (String) registerRequest.get("name");
            String roleStr = (String) registerRequest.get("role");

            System.out.println("📝 Registration: " + email + " role: " + roleStr);

            if (userRepository.findByEmail(email).isPresent()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Email already registered"));
            }

            User user;
            switch (roleStr.toUpperCase()) {
                case "ORGANIZATION": {
                    Organization org = new Organization();
                    if (registerRequest.get("sector") != null)
                        org.setSector((String) registerRequest.get("sector"));
                    if (registerRequest.get("address") != null)
                        org.setAddress((String) registerRequest.get("address"));
                    if (registerRequest.get("phone") != null)
                        org.setPhone((String) registerRequest.get("phone"));
                    String dateStr = (String) registerRequest.get("dateOfFoundation");
                    if (dateStr != null && !dateStr.isEmpty())
                        org.setDateOfFoundation(LocalDate.parse(dateStr));
                    user = org;
                    break;
                }
                case "EVALUATOR": {
                    Evaluator evaluator = new Evaluator();
                    if (registerRequest.get("department") != null)
                        evaluator.setDepartment((String) registerRequest.get("department"));
                    if (registerRequest.get("roleLevel") != null)
                        evaluator.setRoleLevel((String) registerRequest.get("roleLevel"));
                    if (registerRequest.get("domainOfExpertise") != null)
                        evaluator.setDomainOfExpertise((String) registerRequest.get("domainOfExpertise"));
                    user = evaluator;
                    break;
                }
                case "ADMIN":
                    user = new Administrator();
                    break;
                default:
                    return ResponseEntity.badRequest()
                            .body(Map.of("error", "Invalid role: " + roleStr));
            }

            user.setEmail(email);
            user.setPassword(passwordEncoder.encode(password));
            user.setName(name);
            user.setRole(UserRole.valueOf(roleStr.toUpperCase()));
            user.setIsActive(true);

            User savedUser = userRepository.save(user);
            System.out.println("✅ User registered: " + email);

            UserDetails userDetails = userDetailsService.loadUserByUsername(email);
            String token = jwtService.generateToken(userDetails);

            Map<String, Object> response = new HashMap<>();
            response.put("token", token);

            Map<String, Object> userInfo = new HashMap<>();
            userInfo.put("userId", savedUser.getUserId());
            userInfo.put("email", savedUser.getEmail());
            userInfo.put("name", savedUser.getName());
            userInfo.put("role", savedUser.getRole().toString());
            response.put("user", userInfo);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("❌ Registration failed: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Registration failed: " + e.getMessage()));
        }
    }
}