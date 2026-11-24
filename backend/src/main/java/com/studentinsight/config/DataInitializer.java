package com.studentinsight.config;

import com.studentinsight.user.Role;
import com.studentinsight.user.User;
import com.studentinsight.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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

    @Value("${app.bootstrap.default-user.enabled:true}")
    private boolean bootstrapEnabled;

    @Value("${app.bootstrap.default-user.username:user}")
    private String defaultUsername;

    @Value("${app.bootstrap.default-user.email:user@unklab.ac.id}")
    private String defaultEmail;

    @Value("${app.bootstrap.default-user.password:password}")
    private String defaultPassword;

    @Override
    @Transactional
    public void run(String... args) {
        if (!bootstrapEnabled) {
            return;
        }
        if (!userRepository.existsByUsername(defaultUsername)) {
            if ("password".equals(defaultPassword)) {
                log.warn("Bootstrap default user '{}' is using a weak development password. Set APP_BOOTSTRAP_DEFAULT_USER_PASSWORD in production!", defaultUsername);
            }
            User defaultUser = User.builder()
                    .username(defaultUsername)
                    .email(defaultEmail)
                    .passwordHash(passwordEncoder.encode(defaultPassword))
                    .fullName("User StudentInsight")
                    .role(Role.ROLE_USER)
                    .active(true)
                    .build();
            userRepository.save(defaultUser);
            log.info("Initialized bootstrap single-role account: username='{}'", defaultUsername);
        }
    }
}
