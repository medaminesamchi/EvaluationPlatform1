package com.governance.evaluation.config;

import com.governance.evaluation.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Collections;

@Configuration
@RequiredArgsConstructor
public class ApplicationConfig {
    @Bean
    public UserDetailsService userDetailsService() {
        return username -> userRepository.findByEmail(username)
                .map(user -> {
                    System.out.println("🔍 Loading user: " + user.getEmail());
                    System.out.println("🔍 Password hash from DB: " + user.getPassword());
                    System.out.println("🔍 Is active: " + user.getIsActive());

                    var userDetails = org.springframework.security.core.userdetails.User
                            .withUsername(user.getEmail())
                            .password(user.getPassword())
                            .authorities(Collections.singletonList(
                                    new SimpleGrantedAuthority(user.getRole().toString())
                            ))
                            .accountExpired(false)
                            .accountLocked(false)
                            .credentialsExpired(false)
                            .disabled(!user.getIsActive())
                            .build();

                    System.out.println("🔍 UserDetails password: " + userDetails.getPassword());
                    System.out.println("🔍 UserDetails authorities: " + userDetails.getAuthorities());
                    System.out.println("🔍 UserDetails isEnabled: " + userDetails.isEnabled());
                    System.out.println("🔍 UserDetails isAccountNonLocked: " + userDetails.isAccountNonLocked());

                    return userDetails;
                })
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
    }


    private final UserRepository userRepository;

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userDetailsService());
        authProvider.setPasswordEncoder(passwordEncoder());
        System.out.println("✅ AuthenticationProvider configured");
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        System.out.println("✅ AuthenticationManager configured");
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        System.out.println("✅ PasswordEncoder configured");
        return new BCryptPasswordEncoder();
    }
}