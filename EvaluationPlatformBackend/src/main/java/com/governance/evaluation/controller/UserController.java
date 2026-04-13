package com.governance.evaluation.controller;

import com.governance.evaluation.entity.*;
import com.governance.evaluation.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser() {
        try {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Map<String, Object> dto = new HashMap<>();
            dto.put("userId", user.getUserId());
            dto.put("name", user.getName());
            dto.put("email", user.getEmail());
            dto.put("role", user.getRole().toString());
            dto.put("isActive", user.getIsActive());
            if (user instanceof OrganizationAdmin orgAdmin) {
                dto.put("position", orgAdmin.getPosition());
                dto.put("grade", orgAdmin.getGrade());
            }

            if (user.getRole() == UserRole.ORGANIZATION && user instanceof OrganizationAdmin orgAdmin && orgAdmin.getOrganization() != null) {
                Organization org = orgAdmin.getOrganization();
                dto.put("sector", org.getSector());
                dto.put("address", org.getAddress());
                dto.put("phone", org.getPhone());
                dto.put("dateOfFoundation", org.getDateOfFoundation());
                dto.put("description", org.getDescription());
                dto.put("size", org.getSize());
                dto.put("website", org.getWebsite());
                dto.put("faxNumber", org.getFaxNumber());
                dto.put("employeeCount", org.getEmployeeCount());
            } else if (user instanceof Evaluator) {
                Evaluator eval = (Evaluator) user;
                dto.put("department", eval.getDepartment());
                dto.put("roleLevel", eval.getRoleLevel());
                dto.put("domainOfExpertise", eval.getDomainOfExpertise());
            }

            return ResponseEntity.ok(dto);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to fetch user"));
        }
    }

    @PutMapping("/me")
    public ResponseEntity<?> updateProfile(@RequestBody Map<String, Object> updates) {
        try {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            if (updates.containsKey("name") && updates.get("name") != null)
                user.setName((String) updates.get("name"));
            if (user instanceof OrganizationAdmin orgAdmin) {
                if (updates.containsKey("position")) orgAdmin.setPosition((String) updates.get("position"));
                if (updates.containsKey("grade")) orgAdmin.setGrade((String) updates.get("grade"));
            }

            if (user.getRole() == UserRole.ORGANIZATION && user instanceof OrganizationAdmin orgAdmin && orgAdmin.getOrganization() != null) {
                Organization org = orgAdmin.getOrganization();
                if (updates.containsKey("sector"))      org.setSector((String) updates.get("sector"));
                if (updates.containsKey("address"))     org.setAddress((String) updates.get("address"));
                if (updates.containsKey("phone"))       org.setPhone((String) updates.get("phone"));
                if (updates.containsKey("description")) org.setDescription((String) updates.get("description"));
                if (updates.containsKey("size"))        org.setSize((String) updates.get("size"));
                if (updates.containsKey("website"))     org.setWebsite((String) updates.get("website"));
                if (updates.containsKey("faxNumber"))   org.setFaxNumber((String) updates.get("faxNumber"));
                if (updates.containsKey("employeeCount")) {
                    Object count = updates.get("employeeCount");
                    if (count != null && !count.toString().isEmpty()) org.setEmployeeCount(Integer.parseInt(count.toString()));
                }
                if (updates.containsKey("dateOfFoundation")) {
                    String d = (String) updates.get("dateOfFoundation");
                    if (d != null && !d.isEmpty()) org.setDateOfFoundation(LocalDate.parse(d));
                }
            } else if (user instanceof Evaluator) {
                Evaluator eval = (Evaluator) user;
                if (updates.containsKey("department"))       eval.setDepartment((String) updates.get("department"));
                if (updates.containsKey("roleLevel"))        eval.setRoleLevel((String) updates.get("roleLevel"));
                if (updates.containsKey("domainOfExpertise")) eval.setDomainOfExpertise((String) updates.get("domainOfExpertise"));
            }

            userRepository.save(user);

            return ResponseEntity.ok(Map.of("message", "Profile updated successfully"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to update profile"));
        }
    }

    @PostMapping("/me/change-password")
    public ResponseEntity<?> changePassword(@RequestBody Map<String, String> request) {
        try {
            String email = SecurityContextHolder.getContext().getAuthentication().getName();
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            String currentPassword = request.get("currentPassword");
            String newPassword = request.get("newPassword");

            if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Current password is incorrect"));
            }

            if (newPassword == null || newPassword.length() < 6) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "New password must be at least 6 characters"));
            }

            user.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);

            return ResponseEntity.ok(Map.of("message", "Password changed successfully"));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Failed to change password"));
        }
    }
}