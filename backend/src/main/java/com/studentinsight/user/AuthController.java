package com.studentinsight.user;

import com.studentinsight.common.ApiResponse;
import com.studentinsight.config.JwtTokenProvider;
import com.studentinsight.user.dto.ChangePasswordRequest;
import com.studentinsight.user.dto.LoginRequest;
import com.studentinsight.user.dto.LoginResponse;
import com.studentinsight.user.dto.UpdateUserRequest;
import com.studentinsight.user.dto.UserDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    private final UserService userService;
    private final UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> authenticateUser(@Valid @RequestBody LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getUsername(),
                        loginRequest.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = tokenProvider.generateToken(authentication);

        User user = userRepository.findByUsername(loginRequest.getUsername())
                .or(() -> userRepository.findByEmail(loginRequest.getUsername()))
                .orElseThrow();

        LoginResponse loginResponse = LoginResponse.builder()
                .token(jwt)
                .tokenType("Bearer")
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .build();

        return ResponseEntity.ok(ApiResponse.ok("Berhasil masuk ke sistem", loginResponse));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDTO>> getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(ApiResponse.error("Sesi tidak valid. Silakan masuk kembali."));
        }
        UserDTO user = userService.getUserByUsername(authentication.getName());
        return ResponseEntity.ok(ApiResponse.ok("Profil pengguna dimuat", user));
    }

    @PutMapping("/profile")
    public ResponseEntity<ApiResponse<UserDTO>> updateProfile(
            Authentication authentication,
            @RequestBody UpdateUserRequest request) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(ApiResponse.error("Sesi tidak valid. Silakan masuk kembali."));
        }
        UserDTO current = userService.getUserByUsername(authentication.getName());
        request.setRole(Role.ROLE_USER);
        UserDTO updated = userService.updateUser(current.getId(), request);
        return ResponseEntity.ok(ApiResponse.ok("Profil akun berhasil diperbarui", updated));
    }

    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(
            Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).body(ApiResponse.error("Sesi tidak valid. Silakan masuk kembali."));
        }
        userService.changePassword(authentication.getName(), request);
        return ResponseEntity.ok(ApiResponse.ok("Password akun berhasil diperbarui", null));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout() {
        SecurityContextHolder.clearContext();
        return ResponseEntity.ok(ApiResponse.ok("Berhasil keluar", null));
    }
}
