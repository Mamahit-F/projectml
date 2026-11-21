package com.studentinsight.config;

import com.studentinsight.user.Role;
import com.studentinsight.user.User;
import com.studentinsight.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (!userRepository.existsByUsername("user")) {
            User defaultUser = User.builder()
                    .username("user")
                    .email("user@unklab.ac.id")
                    .passwordHash(passwordEncoder.encode("password"))
                    .fullName("User StudentInsight")
                    .role(Role.ROLE_USER)
                    .active(true)
                    .build();
            userRepository.save(defaultUser);
            log.info("Initialized default single-role account: username='user', password='password'");
        }
    }
}
